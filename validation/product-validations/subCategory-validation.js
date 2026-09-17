const Joi = require("joi");

const subCategoryIdSchema = Joi.string().hex().length(24).required();

const categoryIdSchema = Joi.string().hex().length(24).required();

const createSubCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),

  slug: Joi.string().trim().min(1).max(100).optional(),

  category: categoryIdSchema,

  isActive: Joi.boolean().optional(),

  sortOrder: Joi.number().integer().min(0).optional(),
}).unknown(false);

const editSubCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),

  slug: Joi.string().trim().min(1).max(100).optional(),

  category: Joi.string().hex().length(24).optional(),

  isActive: Joi.boolean().optional(),
  deactivation: Joi.object({
    subCategoryIds: Joi.array().items(Joi.string().hex().length(24).lowercase()).unique().max(5000).default([]),
    productIds: Joi.array().items(Joi.string().hex().length(24).lowercase()).unique().max(5000).default([]),
  }).unknown(false).when('isActive', { is: Joi.valid(false).required(), then: Joi.required(), otherwise: Joi.forbidden() }),

  sortOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .unknown(false)
  .messages({
    "object.min": "at least one field must be provided for update",
  });

module.exports = {
  subCategoryIdSchema,
  createSubCategorySchema,
  editSubCategorySchema,
};
