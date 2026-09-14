const Joi = require("joi");

const pricesSchema = Joi.object({
  gold18: Joi.number().min(0).allow(null),

  gold21: Joi.number().min(0).allow(null),

  gold22: Joi.number().min(0).allow(null),

  gold24: Joi.number().min(0).allow(null),
})
  .min(1)
  .unknown(false);

const createGoldPricingSchema = Joi.object({
  prices: Joi.object({
    gold18: Joi.number().min(0).allow(null).required(),

    gold21: Joi.number().min(0).allow(null),

    gold22: Joi.number().min(0).allow(null),

    gold24: Joi.number().min(0).allow(null),
  })
    .required()
    .unknown(false),

  profitPercent: Joi.number().min(0).default(7),

  taxPercent: Joi.number().min(0).default(9),

  source: Joi.string().trim().max(100).default("manual"),
}).unknown(false);

const updateGoldPricingSchema = Joi.object({
  prices: pricesSchema,

  profitPercent: Joi.number().min(0),

  taxPercent: Joi.number().min(0),

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
