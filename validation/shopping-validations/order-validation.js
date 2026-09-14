const Joi = require("joi");

const orderIdSchema = Joi.string().hex().length(24).required();

const prepareOrderSchema = Joi.object({
  shippingMethodId: Joi.string().hex().length(24).required(),
  addressId: Joi.string().hex().length(24).optional(),
}).unknown(false);

const adminUpdateOrderSchema = Joi.object({
  trackingCode: Joi.string().trim().max(80).allow(""),
  carrier: Joi.string().trim().max(80).allow(""),
  status: Joi.string().valid("confirmed", "shipped", "delivered", "cancelled").required(),
}).unknown(false);

module.exports = {
  orderIdSchema,
  prepareOrderSchema,
  adminUpdateOrderSchema,
};
