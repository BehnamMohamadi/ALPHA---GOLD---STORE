const User = require("../models/user-model");

const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");
const { ApiFeatures } = require("../utils/api-features");

const getAllUsers = catchAsync(async (req, res) => {
  const features = new ApiFeatures(User.find(), req.query, ["password"])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [users, total] = await Promise.all([
    features.query,
    User.countDocuments(features.filterObject),
  ]);

  res.status(200).json({
    status: "success",
    page: features.page,
    perPage: features.limit,
    total,
    totalPages: Math.ceil(total / features.limit),
    results: users.length,
    data: {
      users,
    },
  });
});

const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return next(new AppError(404, `user (id: ${req.params.userId}) not found`));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const addUser = catchAsync(async (req, res) => {
  const user = await User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    phonenumber: req.body.phonenumber,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || "user",
  });

  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
});

const getActiveAdminCount = () =>
  User.countDocuments({
    role: "admin",
    "accountStatus.status": "active",
  });

const editUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return next(new AppError(404, `user (id: ${req.params.userId}) not found`));
  }

  const isSelf = user._id.toString() === req.user._id.toString();

  /*
   * Changing your own role from the admin users screen is blocked.
   * This avoids accidental lock-out.
   */
  if (isSelf && req.body.role !== undefined && req.body.role !== user.role) {
    return next(new AppError(400, "admin cannot change own role"));
  }

  /*
   * The last active admin cannot be downgraded.
   */
  if (
    user.role === "admin" &&
    req.body.role === "user" &&
    user.accountStatus.status === "active"
  ) {
    const activeAdminCount = await getActiveAdminCount();

    if (activeAdminCount <= 1) {
      return next(new AppError(400, "last active admin cannot be downgraded"));
    }
  }

  const allowedFields = ["firstname", "lastname", "phonenumber", "email", "role"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  }

  if (req.body.accountStatus) {
    const { status, reason } = req.body.accountStatus;

    if (isSelf && status !== "active") {
      return next(new AppError(400, "admin cannot deactivate or suspend own account"));
    }

    if (
      user.role === "admin" &&
      user.accountStatus.status === "active" &&
      status !== "active"
    ) {
      const activeAdminCount = await getActiveAdminCount();

      if (activeAdminCount <= 1) {
        return next(new AppError(400, "last active admin cannot be disabled"));
      }
    }

    if (status === "active") {
      user.accountStatus = {
        status: "active",
        reason: null,
        at: null,
        by: null,
      };
    } else {
      user.accountStatus = {
        status,
        reason,
        at: new Date(),
        by: req.user._id,
      };
    }
  }

  await user.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const deleteUserById = catchAsync(async (req, res, next) => {
  if (req.user._id.toString() === req.params.userId) {
    return next(
      new AppError(400, "admin cannot deactivate own account from users route"),
    );
  }

  const user = await User.findById(req.params.userId);

  if (!user) {
    return next(new AppError(404, `user (id: ${req.params.userId}) not found`));
  }

  if (user.role === "admin" && user.accountStatus.status === "active") {
    const activeAdminCount = await getActiveAdminCount();

    if (activeAdminCount <= 1) {
      return next(new AppError(400, "last active admin cannot be deactivated"));
    }
  }

  user.accountStatus = {
    status: "deactivated",
    reason: "admin_deactivated",
    at: new Date(),
    by: req.user._id,
  };

  await user.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "user account has been deactivated",
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  addUser,
  editUserById,
  deleteUserById,
};
