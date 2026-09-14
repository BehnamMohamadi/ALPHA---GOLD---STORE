const express = require("express");

const {
  getAdminDashboard,
} = require(
  "../../controller/admin-dashboard-controller",
);

const {
  protect,
  restrictTo,
} = require(
  "../../middleware/auth-middleware",
);

const router = express.Router();

router.use(
  protect,
  restrictTo("admin"),
);

router.get(
  "/dashboard",
  getAdminDashboard,
);

module.exports = router;
