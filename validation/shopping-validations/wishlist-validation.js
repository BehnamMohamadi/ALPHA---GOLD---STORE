const Joi = require("joi");

const addWishlistItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
}).unknown(false);

const wishlistProductIdSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
}).unknown(false);

module.exports = {
  addWishlistItemSchema,
  wishlistProductIdSchema,
};
