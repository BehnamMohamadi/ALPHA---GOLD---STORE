const Joi = require("joi");

const editAccountSchema = Joi.object({
  firstname: Joi.string().trim().min(2).max(30),

  lastname: Joi.string().trim().min(2).max(30),

  email: Joi.string().trim().lowercase().email().allow(""),
})
  .min(1)
  .required()
  .unknown(false)
  .messages({
    "object.min": "at least one field must be provided for update",

    "any.required": "request body is required",

    "object.unknown": "{{#label}} is not allowed to be changed from account settings",
  });

module.exports = {
  editAccountSchema,
};
