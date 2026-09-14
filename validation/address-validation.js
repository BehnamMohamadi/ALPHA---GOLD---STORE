const Joi = require("joi");
const { digits, phone, text } = require("../utils/normalize");

const addressIdSchema = Joi.string().hex().length(24).required();

const createAddressSchema = Joi.object({
  title: Joi.string().trim().min(1).max(40).required(),
  recipientName: Joi.string().trim().min(2).max(80).required(),
  recipientPhone: Joi.string().custom(v => phone(v))
    .pattern(/^09\d{9}$/)
    .required(),
  province: Joi.string().custom(v => text(v)).trim().min(2).max(60).required(),
  city: Joi.string().custom(v => text(v)).trim().min(2).max(60).required(),
  addressLine: Joi.string().trim().min(5).max(500).required(),
  postalCode: Joi.string().custom(v => digits(v))
    .pattern(/^\d{10}$/)
    .required(),
  buildingNumber: Joi.string().trim().max(20).allow("").optional(),
  unit: Joi.string().trim().max(20).allow("").optional(),
  isDefault: Joi.boolean().optional(),
}).unknown(false);

const editAddressSchema = Joi.object({
  title: Joi.string().trim().min(1).max(40).optional(),
  recipientName: Joi.string().trim().min(2).max(80).optional(),
  recipientPhone: Joi.string().custom(v => phone(v))
    .pattern(/^09\d{9}$/)
    .optional(),
  province: Joi.string().custom(v => text(v)).trim().min(2).max(60).optional(),
  city: Joi.string().custom(v => text(v)).trim().min(2).max(60).optional(),
  addressLine: Joi.string().trim().min(5).max(500).optional(),
  postalCode: Joi.string().custom(v => digits(v))
    .pattern(/^\d{10}$/)
    .optional(),
  buildingNumber: Joi.string().trim().max(20).allow("").optional(),
  unit: Joi.string().trim().max(20).allow("").optional(),
  isDefault: Joi.boolean().optional(),
})
  .min(1)
  .unknown(false);

module.exports = {
  addressIdSchema,
  createAddressSchema,
  editAddressSchema,
};
