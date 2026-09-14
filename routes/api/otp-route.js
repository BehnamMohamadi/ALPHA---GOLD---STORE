const router = require("express").Router();
const Joi = require("joi");
const crypto = require("node:crypto");
const User = require("../../models/user-model");
const { requestOtp, consumeOtp } = require("../../services/otp-service");
const { validate } = require("../../middleware/validate");
const { authRateLimit } = require("../../middleware/auth-rate-limit");
const { protect } = require("../../middleware/auth-middleware");
const { catchAsync } = require("../../utils/catch-async");
const { AppError } = require("../../utils/app-error");
const { signAccessToken } = require("../../utils/jwt");
const normalize = require("../../utils/normalize");
const phoneSchema = Joi.string().custom(v => normalize.phone(v)).pattern(/^09\d{9}$/).required();
const verifySchema = Joi.object({ phone: phoneSchema, challenge: Joi.string().guid().required(), code: Joi.string().custom(v => normalize.digits(v)).pattern(/^\d{6}$/).required() }).unknown(false);
const setSession = (res, user) => res.cookie("accessToken", signAccessToken(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 86400000 });
router.post("/request", authRateLimit, validate(Joi.object({ phone: phoneSchema }).unknown(false)), catchAsync(async (req, res) => {
  res.json({ status: "success", data: await requestOtp(req.body.phone) });
}));
router.post("/verify", authRateLimit, validate(verifySchema), catchAsync(async (req, res) => {
  await consumeOtp(req.body);
  let user = await User.findOne({ phonenumber: req.body.phone });
  if (user && user.accountStatus.status !== "active") throw new AppError(403, "ورود برای این حساب مجاز نیست.");
  if (!user) {
    try { user = await User.create({ phonenumber: req.body.phone, firstname: "کاربر", lastname: "آلفا", password: crypto.randomBytes(32).toString("hex"), profileCompleted: false, phoneVerifiedAt: new Date() }); }
    catch (e) { if (e.code !== 11000) throw e; user = await User.findOne({ phonenumber: req.body.phone }); }
  }
  if (!user || !["user", "admin"].includes(user.role) || user.accountStatus.status !== "active") throw new AppError(403, "ورود مجاز نیست.");
  user.phoneVerifiedAt = new Date(); await user.save(); setSession(res, user);
  res.json({ status: "success", data: { user } });
}));
router.post("/phone/request", protect, authRateLimit, validate(Joi.object({ phone: phoneSchema }).unknown(false)), catchAsync(async (req, res) => {
  if (req.user.role === "admin") throw new AppError(403, "تغییر شماره مدیر از این مسیر مجاز نیست.");
  if (await User.exists({ phonenumber: req.body.phone })) throw new AppError(409, "این شماره قابل استفاده نیست.");
  res.json({ status: "success", data: await requestOtp(req.body.phone, "phone_change", req.user._id) });
}));
router.post("/phone/verify", protect, authRateLimit, validate(verifySchema), catchAsync(async (req, res) => {
  if (req.user.role === "admin") throw new AppError(403, "مجاز نیست.");
  await consumeOtp({ ...req.body, purpose: "phone_change", requester: req.user._id });
  req.user.phonenumber = req.body.phone; req.user.phoneVerifiedAt = new Date(); req.user.tokenVersion += 1;
  await req.user.save(); setSession(res, req.user); res.json({ status: "success", data: { user: req.user } });
}));
module.exports = router;
