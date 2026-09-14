const { Schema, model } = require("mongoose");
const schema = new Schema({
  phone: { type: String, required: true, unique: true },
  challenge: String, hash: { type: String, select: false },
  purpose: { type: String, enum: ["login", "phone_change"] },
  requester: { type: Schema.Types.ObjectId, ref: "User", default: null },
  attempts: { type: Number, default: 0 }, consumed: { type: Boolean, default: false },
  expiresAt: Date, nextSendAt: Date, windowStart: Date, sends: { type: Number, default: 0 },
  purgeAt: { type: Date, expires: 0 }
}, { timestamps: true });
module.exports = model("Otp", schema);
