const Joi = require("joi");

const objectIdSchema = Joi.string().hex().length(24).required();

const createUserSchema = Joi.object({
  firstname: Joi.string().trim().min(3).max(30).required(),

  lastname: Joi.string().trim().min(3).max(30).required(),

  phonenumber: Joi.string()
    .pattern(/^09\d{9}$/)
    .required(),

  email: Joi.string().trim().lowercase().email().optional(),

  password: Joi.string().min(8).max(128).required(),

  role: Joi.string().valid("user", "admin").default("user"),
}).unknown(false);

const editUserSchema = Joi.object({
  firstname: Joi.string().trim().min(3).max(30).optional(),

  lastname: Joi.string().trim().min(3).max(30).optional(),

  phonenumber: Joi.string()
    .pattern(/^09\d{9}$/)
    .optional(),

  email: Joi.string().trim().lowercase().email().allow("").optional(),

  role: Joi.string().valid("user", "admin").optional(),

  accountStatus: Joi.object({
    status: Joi.string().valid("active", "deactivated", "suspended").required(),

    reason: Joi.when("status", {
      is: "active",
      then: Joi.valid(null).default(null),
      otherwise: Joi.string().valid("admin_deactivated", "security", "other").required(),
    }),
  })
    .optional()
    .unknown(false),
})
  .min(1)
  .unknown(false);

module.exports = {
  objectIdSchema,
  createUserSchema,
  editUserSchema,
};
