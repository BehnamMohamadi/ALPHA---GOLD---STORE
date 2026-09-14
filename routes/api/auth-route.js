const express = require("express");

const { register, login, logout } = require("../../controller/auth-controller");

const { validate } = require("../../middleware/validate");
const { authRateLimit } = require("../../middleware/auth-rate-limit");
const { preventIfAuthenticated } = require("../../middleware/auth-middleware");

const { registerSchema, loginSchema } = require("../../validation/auth-validation");

const router = express.Router();

router.post(
  "/register",
  authRateLimit,
  preventIfAuthenticated,
  validate(registerSchema),
  (req, res) => res.status(410).json({ status: "fail", message: "برای ثبت‌نام از ورود پیامکی استفاده کنید." }),
);

router.post(
  "/login",
  authRateLimit,
  preventIfAuthenticated,
  validate(loginSchema),
  login,
);

router.post("/logout", logout);

module.exports = router;
