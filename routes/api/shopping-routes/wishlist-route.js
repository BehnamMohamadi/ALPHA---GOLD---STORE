const express = require("express");

const {
  getWishlist,
  addWishlistItem,
  deleteWishlistItem,
  clearWishlist,
} = require("../../../controller/shopping-controllers/wishlist-controller");

const { protect } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");

const {
  addWishlistItemSchema,
  wishlistProductIdSchema,
} = require("../../../validation/shopping-validations/wishlist-validation");

const router = express.Router();

router.use(protect);

router.get("/", getWishlist);

router.post("/", validate(addWishlistItemSchema), addWishlistItem);

router.delete(
  "/:productId",
  validate(wishlistProductIdSchema, "params"),
  deleteWishlistItem,
);

router.delete("/", clearWishlist);

module.exports = router;
