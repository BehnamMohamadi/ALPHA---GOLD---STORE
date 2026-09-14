const { AppError } = require("../utils/app-error");

const validateParam = (paramName, schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params[paramName]);

  if (error) {
    return next(new AppError(400, `invalid ${paramName}`));
  }

  req.params[paramName] = value;
  next();
};

module.exports = { validateParam };
