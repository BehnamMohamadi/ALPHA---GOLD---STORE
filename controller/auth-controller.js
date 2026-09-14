const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");
const { signAccessToken } = require("../utils/jwt");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: Number(process.env.AUTH_COOKIE_DAYS || 7) * 24 * 60 * 60 * 1000,
});

const register = catchAsync(async (req, res) => {
  const user = await User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    phonenumber: req.body.phonenumber,
    email: req.body.email,
    password: req.body.password,
  });

  const token = signAccessToken(user);

  res.cookie("accessToken", token, getCookieOptions());

  res.status(201).json({
    status: "success",
    data: { user },
  });
});

const login = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    phonenumber: req.body.phonenumber,
  }).select("+password");

  if (
    !user ||
    user.accountStatus.status !== "active" ||
    !(await user.comparePassword(req.body.password))
  ) {
    return next(new AppError(401, "phonenumber or password is incorrect"));
  }

  const token = signAccessToken(user);

  res.cookie("accessToken", token, getCookieOptions());

  user.password = undefined;

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

const logout = (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.status(200).json({
    status: "success",
    message: "logged out",
  });
};

module.exports = {
  register,
  login,
  logout,
};
