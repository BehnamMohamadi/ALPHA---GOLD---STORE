const crypto = require("node:crypto");
const Otp = require("../models/otp-model");
const { Settings, SmsLog } = require("../models/store-models");
const { AppError } = require("../utils/app-error");
const digest = (challenge, code) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${challenge}:${code}`).digest("hex");
const provider = () => process.env.SMS_PROVIDER || "disabled";
const isDev = () => ["development", "test"].includes(process.env.NODE_ENV) && provider() === "mock";
async function sendOtp(phone, code) {
  if (isDev()) return;
  if (provider() !== "kavenegar" || !process.env.KAVENEGAR_API_KEY || !process.env.KAVENEGAR_TEMPLATE)
    throw new AppError(503, "ارسال پیامک هنوز فعال نشده است.");
  try {
    const response = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(process.env.KAVENEGAR_API_KEY)}/verify/lookup.json`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ receptor: phone, token: code, template: process.env.KAVENEGAR_TEMPLATE }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok || data.return?.status !== 200) throw new Error("delivery");
  } catch { throw new AppError(503, "ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید."); }
}
async function requestOtp(phone, purpose = "login", requester = null) {
  if (!isDev() && provider() !== "kavenegar") throw new AppError(503, "ارسال پیامک هنوز فعال نشده است.");
  const settings = await Settings.findOne({ key: "main" });
  const ttl = settings?.otpTtlSeconds || 120, cooldown = settings?.otpResendSeconds || 60;
  try { await Otp.updateOne({ phone }, { $setOnInsert: { phone, windowStart: new Date(), sends: 0 } }, { upsert: true }); }
  catch (e) { if (e.code !== 11000) throw e; }
  const now = new Date();
  await Otp.updateOne({ phone, windowStart: { $lt: new Date(Date.now() - 3600000) } }, { $set: { windowStart: now, sends: 0 } });
  const code = crypto.randomInt(100000, 1000000).toString(), challenge = crypto.randomUUID();
  const entry = await Otp.findOneAndUpdate({ phone, sends: { $lt: 5 }, $or: [{ nextSendAt: { $lte: now } }, { nextSendAt: { $exists: false } }] }, {
    $set: { challenge, hash: digest(challenge, code), purpose, requester, attempts: 0, consumed: false,
      expiresAt: new Date(Date.now() + ttl * 1000), nextSendAt: new Date(Date.now() + cooldown * 1000), purgeAt: new Date(Date.now() + 7200000) },
    $inc: { sends: 1 }
  }, { returnDocument: "after" });
  if (!entry) throw new AppError(429, "برای درخواست دوباره کد صبر کنید. حداکثر ۵ پیامک در ساعت مجاز است.");
  const log = { phoneMasked: `${phone.slice(0, 4)}***${phone.slice(-2)}`, provider: provider() };
  try { await sendOtp(phone, code); await SmsLog.create({ ...log, status: "sent" }); }
  catch (e) {
    await Otp.updateOne({ phone, challenge }, { $set: { consumed: true } });
    await SmsLog.create({ ...log, status: "failed" }); throw e;
  }
  return { challenge, expiresIn: ttl, retryAfter: cooldown, ...(isDev() ? { developmentCode: code } : {}) };
}
async function consumeOtp({ phone, challenge, code, purpose = "login", requester = null }) {
  const entry = await Otp.findOneAndUpdate({ phone, challenge, purpose, requester, consumed: false, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { returnDocument: "after" }).select("+hash");
  if (!entry || !crypto.timingSafeEqual(Buffer.from(entry.hash, "hex"), Buffer.from(digest(challenge, code), "hex")))
    throw new AppError(400, "کد نادرست یا منقضی شده است.");
  const consumed = await Otp.updateOne({ _id: entry._id, challenge, consumed: false }, { $set: { consumed: true } });
  if (!consumed.modifiedCount) throw new AppError(400, "این کد قبلاً استفاده شده است.");
}
module.exports = { requestOtp, consumeOtp, isDev, provider };
