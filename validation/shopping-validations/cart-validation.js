const Joi = require("joi");

const addCartItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),

  quantity: Joi.number().integer().min(1).default(1),
}).unknown(false);

const updateCartItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),

  quantity: Joi.number().integer().min(1).required(),
}).unknown(false);

const deleteCartItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
}).unknown(false);

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  deleteCartItemSchema,
};
