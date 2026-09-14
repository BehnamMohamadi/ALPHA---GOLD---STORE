class AppError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message);

    this.statusCode = statusCode;

    this.status = String(statusCode).startsWith("4") ? "fail" : "error";

    this.details = details;

    this.errorCode = code;

    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  AppError,
};
