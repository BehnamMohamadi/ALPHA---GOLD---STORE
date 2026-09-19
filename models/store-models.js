const { Schema, model } = require("mongoose");
const settingsSchema = new Schema({
  key: { type: String, default: "main", unique: true },
  heroTitle: { type: String, default: "طلایی برای هر روز" },
  heroSubtitle: { type: String, default: "انتخاب‌های ظریف، برای لحظه‌هایی که به شما تعلق دارند." },
  phone: { type: String, default: "" }, email: { type: String, default: "" }, address: { type: String, default: "" },
  instagram: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
  salesEnabled: { type: Boolean, default: false },
  maxRateAgeMinutes: { type: Number, default: 1440, min: 1, max: 10080 },
  otpTtlSeconds: { type: Number, default: 120, min: 60, max: 300 },
  otpResendSeconds: { type: Number, default: 60, min: 30, max: 180 },
}, { timestamps: true });
const shippingSchema = new Schema({
  name: { type: String, required: true }, description: { type: String, default: "" },
  provinces: { type: [String], default: [] }, cost: { type: Number, min: 0, required: true },
  freeAbove: { type: Number, min: 0, default: null },
  isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
const pageSchema = new Schema({
  slug: { type: String, required: true, unique: true }, title: { type: String, required: true },
  body: { type: String, default: "" }, published: { type: Boolean, default: false }
}, { timestamps: true });
const ticketSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  subject: { type: String, required: true, maxlength: 120 },
  status: { type: String, enum: ["open", "answered", "closed"], default: "open" },
  messages: [{ body: { type: String, required: true, maxlength: 3000 }, admin: Boolean, at: { type: Date, default: Date.now } }]
}, { timestamps: true });
const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" }, action: String, target: String,
  details: Schema.Types.Mixed
}, { timestamps: true });
const smsSchema = new Schema({ phoneMasked: String, provider: String, status: String }, { timestamps: true });
smsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86400 });
module.exports = {
  Settings: model("StoreSettings", settingsSchema), Shipping: model("ShippingMethod", shippingSchema),
  Page: model("ContentPage", pageSchema), Ticket: model("SupportTicket", ticketSchema),
  Audit: model("AuditLog", auditSchema), SmsLog: model("SmsLog", smsSchema)
};
