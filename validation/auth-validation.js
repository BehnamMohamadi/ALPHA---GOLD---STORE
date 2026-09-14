const Joi = require("joi");

const phonenumberSchema = Joi.string()
  .pattern(/^09\d{9}$/)
  .messages({
    "string.pattern.base":
      "phonenumber must be a valid Iranian mobile number",
  });

const registerSchema = Joi.object({
  firstname: Joi.string().trim().min(3).max(30).required(),
  lastname: Joi.string().trim().min(3).max(30).required(),
  phonenumber: phonenumberSchema.required(),
  email: Joi.string().trim().lowercase().email().optional(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  phonenumber: phonenumberSchema.required(),
  password: Joi.string().min(8).max(128).required(),
});

module.exports = { registerSchema, loginSchema };
