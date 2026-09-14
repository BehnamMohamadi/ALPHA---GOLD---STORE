const express = require("express");

const {
  prepareOrder,
  getMyOrders,
  getMyOrderHistory,
  getMyOrder,
  cancelOrder,
  getAllOrders,
  getOrderForAdmin,
  updateOrderForAdmin,
} = require(
  "../../../controller/shopping-controllers/order-controller",
);

const {
  protect,
  restrictTo,
} = require(
  "../../../middleware/auth-middleware",
);

const {
  validate,
} = require(
  "../../../middleware/validate",
);

const {
  validateParam,
} = require(
  "../../../middleware/validate-param",
);

const {
  orderIdSchema,
  prepareOrderSchema,
  adminUpdateOrderSchema,
} = require(
  "../../../validation/shopping-validations/order-validation",
);

const router = express.Router();

router.use(protect);

router.get(
  "/all",
  restrictTo("admin"),
  getAllOrders,
);

router
  .route("/admin/:orderId")
  .get(
    restrictTo("admin"),
    validateParam(
      "orderId",
      orderIdSchema,
    ),
    getOrderForAdmin,
  )
  .patch(
    restrictTo("admin"),
    validateParam(
      "orderId",
      orderIdSchema,
    ),
    validate(
      adminUpdateOrderSchema,
    ),
    updateOrderForAdmin,
  );

router.get(
  "/history",
  getMyOrderHistory,
);

router.get(
  "/",
  getMyOrders,
);

router.post(
  "/",
  validate(prepareOrderSchema),
  prepareOrder,
);

router.get(
  "/:orderId",
  validateParam(
    "orderId",
    orderIdSchema,
  ),
  getMyOrder,
);

router.delete(
  "/:orderId",
  validateParam(
    "orderId",
    orderIdSchema,
  ),
  cancelOrder,
);

module.exports = router;
