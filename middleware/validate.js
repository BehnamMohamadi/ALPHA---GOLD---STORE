const { AppError } = require("../utils/app-error");

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const input = req[source] ?? {};

    const { error, value } = schema.validate(input, {
      abortEarly: false,
    });

    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join(".") || source,
        message: item.message,
      }));

      return next(new AppError(400, "validation failed", details));
    }

    req[source] = value;

    next();
  };
};

module.exports = {
  validate,
};
