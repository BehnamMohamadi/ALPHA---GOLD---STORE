const Joi = require("joi");

const productIdSchema = Joi.string().hex().length(24).required();

const objectIdSchema = Joi.string().hex().length(24).required();

const detailSchema = Joi.object({
  title: Joi.string().trim().required(),

  value: Joi.string().trim().required(),
}).unknown(false);

const wageSchema = Joi.object({
  type: Joi.string().valid("percent", "fixed").default("percent"),

  value: Joi.number().min(0).default(0),
}).unknown(false);

const pricingSchema = Joi.object({
  mode: Joi.string().valid("standard", "custom").default("standard"),

  profitPercent: Joi.number().min(0).allow(null).default(null),

  taxPercent: Joi.number().min(0).allow(null).default(null),

  wageEnabled: Joi.boolean().default(true),
}).unknown(false);

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  slug: Joi.string().trim(),

  sku: Joi.string().trim().required(),

  category: objectIdSchema,

  subCategory: objectIdSchema,

  gender: Joi.string().valid("female", "male", "kids", "unisex").required(),

  goldWeight: Joi.number().min(0.01).required(),

  karat: Joi.number().valid(18, 21, 22, 24).default(18),

  wage: wageSchema,

  accessoriesPrice: Joi.number().min(0).default(0),

  pricing: pricingSchema,

  details: Joi.array().items(detailSchema).default([]),

  stock: Joi.number().integer().min(0).default(0),

  description: Joi.string().trim().max(5000).allow("").default(""),

  isActive: Joi.boolean().default(true),

  isFeatured: Joi.boolean().default(false),
}).unknown(false);

const editProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),

  slug: Joi.string().trim(),

  sku: Joi.string().trim(),

  category: Joi.string().hex().length(24),

  subCategory: Joi.string().hex().length(24),

  gender: Joi.string().valid("female", "male", "kids", "unisex"),

  goldWeight: Joi.number().min(0.01),

  karat: Joi.number().valid(18, 21, 22, 24),

  wage: wageSchema,

  accessoriesPrice: Joi.number().min(0),

  pricing: pricingSchema,

  details: Joi.array().items(detailSchema),

  stock: Joi.number().integer().min(0),

  description: Joi.string().trim().max(5000).allow(""),

  isActive: Joi.boolean(),

  isFeatured: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "at least one field is required to update the product",
  })
  .unknown(false);

const updateProductImagesSchema = Joi.object({
  images: Joi.array().items(Joi.string().trim().required()).unique().required(),
}).unknown(false);

module.exports = {
  productIdSchema,
  createProductSchema,
  editProductSchema,
  updateProductImagesSchema,
};
