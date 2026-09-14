const multer = require("multer");

const { AppError } = require("../utils/app-error");

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0];

  const value = err.keyValue?.[field];

  if (field === "phonenumber") {
    return new AppError(
      409,

      "this phonenumber is already registered",

      {
        field,
        value,
      },

      "DUPLICATE_PHONE",
    );
  }

  if (field === "email") {
    return new AppError(
      409,

      "this email is already registered",

      {
        field,
        value,
      },

      "DUPLICATE_EMAIL",
    );
  }

  return new AppError(
    409,

    `${field || "value"} already exists`,

    {
      field,
      value,
    },

    "DUPLICATE_VALUE",
  );
};

const handleMulterError = (err) => {
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError(400, "only one image can be uploaded", null, "UNEXPECTED_FILE");
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError(400, "image size must not exceed 5MB", null, "FILE_TOO_LARGE");
  }

  return new AppError(
    400,

    err.message || "file upload failed",

    null,

    "FILE_UPLOAD_FAILED",
  );
};

const handleValidationError = (err) => {
  const details = Object.values(err.errors || {}).map((item) => ({
    field: item.path,

    message: item.message,
  }));

  return new AppError(400, "validation failed", details, "VALIDATION_ERROR");
};

const globalErrorHandler = (err, req, res, next) => {
  let error = err;
  if (err?.name === "VersionError") error = new AppError(409, "اطلاعات هم‌زمان تغییر کرد. صفحه را تازه کنید و دوباره تلاش کنید.");

  /*
   * MongoDB duplicate key.
   *
   * Mongo از code عددی 11000
   * استفاده می‌کند؛ با errorCode
   * خودمان تداخل ندارد.
   */
  if (err?.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  if (err instanceof multer.MulterError) {
    error = handleMulterError(err);
  }

  if (err?.name === "CastError") {
    error = new AppError(
      400,

      `invalid ${err.path}`,

      {
        field: err.path,

        value: err.value,
      },

      "INVALID_ID",
    );
  }

  if (err?.name === "ValidationError") {
    error = handleValidationError(err);
  }

  const exposeError = error.isOperational || process.env.NODE_ENV !== "production";

  res.status(error.statusCode || 500).json({
    status: error.status || "error",

    message: exposeError ? error.message : "internal server error",

    ...(exposeError && error.errorCode
      ? {
          code: error.errorCode,
        }
      : {}),

    ...(exposeError && error.details
      ? {
          details: error.details,
        }
      : {}),
  });
};

module.exports = {
  globalErrorHandler,
};
