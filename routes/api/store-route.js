const router = require("express").Router();
const Joi = require("joi");
const { Settings, Shipping, Page, Ticket, Audit, SmsLog } = require("../../models/store-models");
const Order = require("../../models/shopping-models/order-model");
const { catalog } = require("../../services/catalog-service");
const { provider, isDev } = require("../../services/otp-service");
const { protect, restrictTo } = require("../../middleware/auth-middleware");
const { validate } = require("../../middleware/validate");
const { catchAsync: wrap } = require("../../utils/catch-async");
const { AppError } = require("../../utils/app-error");
const rateLimit = require("express-rate-limit");
const id = Joi.string().hex().length(24), ok = (res, data) => res.json({ status: "success", data });
router.get("/catalog", wrap(async (req, res) => ok(res, await catalog(req.query))));
router.get("/shipping", wrap(async (req, res) => {
  const query = { isActive: true }; if (req.query.province) query.$or = [{ provinces: { $size: 0 } }, { provinces: String(req.query.province) }];
  ok(res, { methods: await Shipping.find(query).sort("sortOrder").lean() });
}));
router.get("/locations", (req, res) => ok(res, { provinces: require("../../data/locations.json") }));
router.use(protect);
const ticketLimit = rateLimit({ windowMs: 3600000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
router.get("/tickets", wrap(async (req, res) => ok(res, { tickets: await Ticket.find({ user: req.user._id }).sort("-updatedAt").limit(100).lean() })));
router.post("/tickets", ticketLimit, validate(Joi.object({ subject: Joi.string().trim().min(3).max(120).required(), message: Joi.string().trim().min(5).max(3000).required(), orderId: id.allow("").optional() }).unknown(false)), wrap(async (req, res) => {
  if (req.body.orderId && !await Order.exists({ _id: req.body.orderId, user: req.user._id })) throw new AppError(404, "سفارش پیدا نشد.");
  ok(res, { ticket: await Ticket.create({ user: req.user._id, order: req.body.orderId || null, subject: req.body.subject, messages: [{ body: req.body.message, admin: false }] }) });
}));
router.post("/tickets/:id/reply", ticketLimit, validate(Joi.object({ message: Joi.string().trim().min(1).max(3000).required() }).unknown(false)), wrap(async (req, res) => {
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: { $ne: "closed" }, "messages.99": { $exists: false } }, { $push: { messages: { body: req.body.message, admin: false, at: new Date() } }, $set: { status: "open" } }, { returnDocument: "after" });
  if (!ticket) throw new AppError(409, "درخواست پیدا نشد یا بسته شده است."); ok(res, { ticket });
}));
router.use("/admin", restrictTo("admin"));
const audit = (req, action, target) => Audit.create({ actor: req.user._id, action, target });
router.get("/admin/settings", wrap(async (req, res) => ok(res, { settings: await Settings.findOne({ key: "main" }) || new Settings(), sms: { provider: provider(), development: isDev(), configured: provider() === "kavenegar" && Boolean(process.env.KAVENEGAR_API_KEY && process.env.KAVENEGAR_TEMPLATE) }, logs: await SmsLog.find().sort("-createdAt").limit(30) })));
router.put("/admin/settings", validate(Joi.object({ heroTitle: Joi.string().trim().min(2).max(100), heroSubtitle: Joi.string().trim().max(240).allow(""), phone: Joi.string().max(30).allow(""), email: Joi.string().email().allow(""), address: Joi.string().max(500).allow(""), instagram: Joi.string().uri({ scheme: ["https"] }).allow(""), whatsapp: Joi.string().uri({ scheme: ["https"] }).allow(""), salesEnabled: Joi.boolean(), maxRateAgeMinutes: Joi.number().integer().min(1).max(10080), otpTtlSeconds: Joi.number().integer().min(60).max(300), otpResendSeconds: Joi.number().integer().min(30).max(180) }).min(1).unknown(false)), wrap(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: "main" }, { $set: req.body }, { upsert: true, returnDocument: "after", runValidators: true }); await audit(req, "settings.updated", "main"); ok(res, { settings });
}));
const shippingSchema = Joi.object({ name: Joi.string().trim().min(2).max(80).required(), description: Joi.string().trim().max(300).allow("").default(""), provinces: Joi.array().items(Joi.string().max(60)).max(31).default([]), cost: Joi.number().integer().min(0).max(1e9).required(), freeAbove: Joi.number().integer().min(0).allow(null).default(null), isActive: Joi.boolean().default(true), sortOrder: Joi.number().integer().min(0).default(0) }).unknown(false);
router.get("/admin/shipping", wrap(async (req, res) => ok(res, { methods: await Shipping.find().sort("sortOrder") })));
router.post("/admin/shipping", validate(shippingSchema), wrap(async (req, res) => { const method = await Shipping.create(req.body); await audit(req, "shipping.created", String(method._id)); ok(res, { method }); }));
router.put("/admin/shipping/:id", validate(shippingSchema), wrap(async (req, res) => { const method = await Shipping.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: "after", runValidators: true }); if (!method) throw new AppError(404, "روش ارسال پیدا نشد."); await audit(req, "shipping.updated", req.params.id); ok(res, { method }); }));
router.get("/admin/pages", wrap(async (req, res) => ok(res, { pages: await Page.find().sort("slug") })));
router.put("/admin/pages/:slug", validate(Joi.object({ title: Joi.string().trim().min(2).max(100).required(), body: Joi.string().max(8000).allow("").required(), published: Joi.boolean().required() }).unknown(false)), wrap(async (req, res) => {
  if (!["about", "contact", "guide", "faq", "shipping", "returns", "privacy", "terms"].includes(req.params.slug)) throw new AppError(400, "صفحه معتبر نیست.");
  const page = await Page.findOneAndUpdate({ slug: req.params.slug }, { $set: req.body }, { returnDocument: "after", upsert: true, runValidators: true }); await audit(req, "page.updated", page.slug); ok(res, { page });
}));
router.get("/admin/tickets", wrap(async (req, res) => ok(res, { tickets: await Ticket.find().populate("user", "firstname lastname phonenumber").sort("-updatedAt").limit(100) })));
router.patch("/admin/tickets/:id", validate(Joi.object({ message: Joi.string().trim().max(3000).allow(""), status: Joi.string().valid("open", "answered", "closed").required() }).unknown(false)), wrap(async (req, res) => {
  const update = { $set: { status: req.body.status } }; if (req.body.message) update.$push = { messages: { body: req.body.message, admin: true, at: new Date() } };
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, "messages.99": { $exists: false } }, update, { returnDocument: "after", runValidators: true }); if (!ticket) throw new AppError(404, "درخواست پیدا نشد یا ظرفیت گفتگو کامل است."); await audit(req, "ticket.updated", req.params.id); ok(res, { ticket });
}));
router.get("/admin/audit", wrap(async (req, res) => ok(res, { logs: await Audit.find().populate("actor", "firstname lastname").sort("-createdAt").limit(100) })));
module.exports = router;
