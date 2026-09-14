const User = require("../models/user-model");
const { verifyAccessToken } = require("../utils/jwt");
const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");

const protect = catchAsync(async (req, res, next) => {
  let token = req.cookies?.accessToken;
  const authorization = req.get("authorization");

  if (!token && authorization?.startsWith("Bearer ")) {
    token = authorization.slice(7);
  }

  if (!token) {
    return next(new AppError(401, "please login first"));
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError(401, "invalid or expired token"));
  }

  const user = await User.findById(payload.sub);

  if (!user || (payload.version || 0) !== (user.tokenVersion || 0)) {
    return next(new AppError(401, "user is not available"));
  }

  if (user.accountStatus.status !== "active") {
    return next(new AppError(403, `account is ${user.accountStatus.status}`));
  }

  req.user = user;
  next();
});

const preventIfAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next();
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next();
  }

  const user = await User.findById(payload.sub);

  if (!user || user.accountStatus.status !== "active") {
    return next();
  }

  return next(new AppError(409, "you are already logged in, please logout first"));
});

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "you do not have permission"));
    }

    next();
  };

module.exports = {
  protect,
  preventIfAuthenticated,
  restrictTo,
};
