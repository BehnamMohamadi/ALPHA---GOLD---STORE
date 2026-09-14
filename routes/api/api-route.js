const express = require("express");

const authRouter = require("./auth-route");
const accountRouter = require("./account-route");
const userRouter = require("./user-route");
const addressRouter = require("./address-route");
const adminRouter = require("./admin-route");

const categoryRouter = require("./product-routes/category-route");
const subCategoryRouter = require("./product-routes/subCategory-route");
const productRouter = require("./product-routes/product-route");
const goldPricingRouter = require("./product-routes/goldPricing-route");

const cartRouter = require("./shopping-routes/cart-route");
const checkoutRouter = require("./shopping-routes/checkout-route");
const orderRouter = require("./shopping-routes/order-route");
const wishlistRouter = require("./shopping-routes/wishlist-route");
const paymentRouter = require("./shopping-routes/payment-route");

const router = express.Router();

router.use("/auth/otp", require("./otp-route"));
router.use("/store", require("./store-route"));
router.use("/auth", authRouter);
router.use("/account", accountRouter);
router.use("/users", userRouter);
router.use("/addresses", addressRouter);
router.use("/admin", adminRouter);

router.use("/categories", categoryRouter);
router.use("/subCategories", subCategoryRouter);
router.use("/products", productRouter);
router.use("/goldPricing", goldPricingRouter);

router.use("/cart", cartRouter);
router.use("/checkout", checkoutRouter);
router.use("/orders", orderRouter);
router.use("/wishlists", wishlistRouter);
router.use("/payments", paymentRouter);

module.exports = router;
