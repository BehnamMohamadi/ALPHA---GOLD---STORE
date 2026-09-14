const Joi = require("joi");

const paymentIdSchema = Joi.string().hex().length(24).required();

const adminResolvePaymentSchema = Joi.object({
  resolution: Joi.string().valid("stock_supplied", "refunded").required(),
}).unknown(false);

module.exports = {
  paymentIdSchema,
  adminResolvePaymentSchema,
};
