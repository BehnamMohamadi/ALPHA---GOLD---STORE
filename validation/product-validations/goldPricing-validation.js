const Joi = require("joi");

const pricesSchema = Joi.object({
  gold18: Joi.number().min(0).allow(null),
  gold21: Joi.number().min(0).allow(null),
  gold22: Joi.number().min(0).allow(null),
  gold24: Joi.number().min(0).allow(null),
})
  .min(1)
  .unknown(false);

const wageSchema = Joi.object({
  type: Joi.string().valid("percent", "fixed").required(),
  value: Joi.number().min(0).allow(null).required(),
}).unknown(false);

const createGoldPricingSchema = Joi.object({
  prices: Joi.object({
    gold18: Joi.number().min(0).allow(null).required(),
    gold21: Joi.number().min(0).allow(null),
    gold22: Joi.number().min(0).allow(null),
    gold24: Joi.number().min(0).allow(null),
  })
    .required()
    .unknown(false),

  wage: wageSchema,

  profitPercent: Joi.number().min(0).allow(null).default(null),

  taxPercent: Joi.number().min(0).allow(null).default(null),

  source: Joi.string().trim().max(100).default("manual"),
}).unknown(false);

const updateGoldPricingSchema = Joi.object({
  prices: pricesSchema,

  wage: wageSchema,

  profitPercent: Joi.number().min(0).allow(null),

  taxPercent: Joi.number().min(0).allow(null),

  source: Joi.string().trim().max(100),
})
  .min(1)
  .messages({
    "object.min": "at least one pricing field is required to update gold pricing",
  })
  .unknown(false);

module.exports = {
  createGoldPricingSchema,
  updateGoldPricingSchema,
};
