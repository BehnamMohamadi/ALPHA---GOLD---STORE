const express = require("express");

const {
  createCheckout,
} = require("../../../controller/shopping-controllers/checkout-controller");

const { protect } = require("../../../middleware/auth-middleware");

const router = express.Router();

router.use(protect);

router.post("/", createCheckout);

module.exports = router;
