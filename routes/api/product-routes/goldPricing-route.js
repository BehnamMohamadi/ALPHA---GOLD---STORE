const express = require("express");

const {
  createGoldPricing,
  getGoldPricing,
  updateGoldPricing,
  deleteGoldPricing,
} = require("../../../controller/product-controllers/goldPricing-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");

const {
  createGoldPricingSchema,
  updateGoldPricingSchema,
} = require("../../../validation/product-validations/goldPricing-validation");

const router = express.Router();

router.get("/", getGoldPricing);

router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate(createGoldPricingSchema),
  createGoldPricing,
);

router.put(
  "/",
  protect,
  restrictTo("admin"),
  validate(updateGoldPricingSchema),
  updateGoldPricing,
);

router.delete("/", protect, restrictTo("admin"), deleteGoldPricing);

module.exports = router;
