const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");

const getUserAccount = catchAsync(async (req, res) => {
  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
});

const editUserAccount = catchAsync(async (req, res) => {
  if (!req.user.profileCompleted && (!req.body.firstname || !req.body.lastname)) throw new AppError(400, "نام و نام خانوادگی را کامل وارد کنید.");
  const allowedFields = ["firstname", "lastname", "email"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      req.user[field] = field === "email" && !req.body[field] ? undefined : req.body[field];
    }
  }

  req.user.profileCompleted = true;
  await req.user.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
});

const deleteUserAccount = catchAsync(async (req, res) => {
  req.user.accountStatus = {
    status: "deactivated",
    reason: "user_deleted_account",
    at: new Date(),
    by: req.user._id,
  };

  await req.user.save({
    validateModifiedOnly: true,
  });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.status(200).json({
    status: "success",
    message: "account has been deactivated successfully",
  });
});

module.exports = {
  getUserAccount,
  editUserAccount,
  deleteUserAccount,
};
