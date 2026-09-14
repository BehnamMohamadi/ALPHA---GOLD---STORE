const express = require("express");

const {
  getCart,
  getAllCarts,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
} = require("../../../controller/shopping-controllers/cart-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");

const {
  addCartItemSchema,
  updateCartItemSchema,
  deleteCartItemSchema,
} = require("../../../validation/shopping-validations/cart-validation");

const router = express.Router();

router.use(protect);

router.get("/all", restrictTo("admin"), getAllCarts);

router.get("/", getCart);

router.post("/", validate(addCartItemSchema), addCartItem);

router.patch("/", validate(updateCartItemSchema), updateCartItem);

router.delete("/item", validate(deleteCartItemSchema), deleteCartItem);

router.delete("/", clearCart);

module.exports = router;
