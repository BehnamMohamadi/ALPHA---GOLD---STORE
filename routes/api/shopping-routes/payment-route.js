const express = require("express");

const {
  createPayment,
  zarinpalCallback,
  mockPaymentSuccess,
  getMyPayments,
  getMyPayment,
  getAllPayments,
  getOrderPaymentsForAdmin,
  resolvePaymentForAdmin,
} = require("../../../controller/shopping-controllers/payment-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validateParam } = require("../../../middleware/validate-param");

const { validate } = require("../../../middleware/validate");

const {
  orderIdSchema,
} = require("../../../validation/shopping-validations/order-validation");

const {
  paymentIdSchema,
  adminResolvePaymentSchema,
} = require("../../../validation/shopping-validations/payment-validation");

const router = express.Router();

router.get("/zarinpal/callback", zarinpalCallback);

router.use(protect);

/*
 * Admin
 */

router.get(
  "/all",

  restrictTo("admin"),

  getAllPayments,
);

router.get(
  "/admin/order/:orderId",

  restrictTo("admin"),

  validateParam("orderId", orderIdSchema),

  getOrderPaymentsForAdmin,
);

/*
 * Route اصلی Review.
 */
router.patch(
  "/admin/:paymentId/review",

  restrictTo("admin"),

  validateParam("paymentId", paymentIdSchema),

  validate(adminResolvePaymentSchema),

  resolvePaymentForAdmin,
);

/*
 * Compatibility با Route قبلی.
 * بعداً در Cleanup نهایی می‌تونیم حذفش کنیم.
 */
router.post(
  "/admin/:paymentId/resolve",

  restrictTo("admin"),

  validateParam("paymentId", paymentIdSchema),

  validate(adminResolvePaymentSchema),

  resolvePaymentForAdmin,
);

/*
 * Start Payment
 */
router.post(
  "/order/:orderId",

  validateParam("orderId", orderIdSchema),

  createPayment,
);

/*
 * Development mock.
 */
router.post(
  "/mock/:paymentId/success",

  validateParam("paymentId", paymentIdSchema),

  mockPaymentSuccess,
);

/*
 * Current User
 */
router.get("/", getMyPayments);

router.get(
  "/:paymentId",

  validateParam("paymentId", paymentIdSchema),

  getMyPayment,
);

module.exports = router;
