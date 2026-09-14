const Joi = require("joi");

const categoryIdSchema = Joi.string().hex().length(24).required();

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),

  slug: Joi.string().trim().min(1).max(100).optional(),

  isActive: Joi.boolean().optional(),

  sortOrder: Joi.number().integer().min(0).optional(),
}).unknown(false);

const editCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),

  slug: Joi.string().trim().min(1).max(100).optional(),

  isActive: Joi.boolean().optional(),

  sortOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .unknown(false)
  .messages({
    "object.min": "at least one field must be provided for update",
  });

module.exports = {
  categoryIdSchema,
  createCategorySchema,
  editCategorySchema,
};
