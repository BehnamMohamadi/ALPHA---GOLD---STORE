const crypto = require("node:crypto"), fs = require("node:fs"), path = require("node:path");
const mongoose = require("mongoose");
async function seedPreview() {
  if (process.env.NODE_ENV === "production" || mongoose.connection.name !== "alpha-preview" || process.env.ALPHA_DEMO !== "true") throw new Error("Preview seed only runs on alpha-preview with ALPHA_DEMO=true.");
  const Category = require("../models/product-models/category-model"), Sub = require("../models/product-models/subCategory-model"), Product = require("../models/product-models/product-model"), Rate = require("../models/product-models/GoldPricing-model"), User = require("../models/user-model");
  const { Settings, Shipping, Page } = require("../models/store-models");
  require("../models/otp-model"); require("../models/shopping-models/order-model"); require("../models/shopping-models/payment-model"); require("../models/shopping-models/cart-model"); require("../models/shopping-models/wishlist-model"); require("../models/address-model");
  for (const model of Object.values(mongoose.models)) await model.init();
  const category = await Category.findOneAndUpdate({ slug: "crafted-gold" }, { $setOnInsert: { name: "طلای اجرت‌دار", slug: "crafted-gold", isActive: true } }, { returnDocument: "after", upsert: true });
  const groups = [["گردنبند", "necklaces"], ["گوشواره", "earrings"], ["دستبند", "bracelets"], ["انگشتر", "rings"]];
  for (let i = 0; i < groups.length; i++) {
    const [name, slug] = groups[i];
    const sub = await Sub.findOneAndUpdate({ category: category._id, slug }, { $setOnInsert: { name, category: category._id, slug, isActive: true, sortOrder: i } }, { returnDocument: "after", upsert: true });
    for (let v = 0; v < 2; v++) {
      const names = [["گردنبند قطره", "گردنبند قطره ظریف"], ["گوشواره حلقه آوا", "گوشواره حلقه کوچک"], ["دستبند دایره نور", "دستبند دایره ظریف"], ["انگشتر دوخط رها", "انگشتر دوخط مینیمال"]];
      const sku = `DEMO-${i}-${v}`;
      if (!await Product.exists({ sku })) await Product.create({ name: names[i][v], slug: `${slug}-${v}`, sku, category: category._id, subCategory: sub._id, gender: "unisex", goldWeight: [3.2, 2.4, 1.8, 2.1][i] + v * .3, karat: 18, wage: { type: "percent", value: 12 + i }, stock: 10, isFeatured: v === 0, coverImage: `/images/brand/demo-${i}.svg`, images: [], description: "طراحی ظریف با خطوط نرم و درخششی آرام؛ همراهی ساده برای استفاده روزمره. این محصول، تصویر و مشخصات صرفاً نمونه نمایشی هستند.", details: [{ title: "رنگ", value: "طلایی" }, { title: "مجموعه", value: "روزمره آلفا" }] });
    }
  }
  await Rate.findOneAndUpdate({ key: "main" }, { $set: { prices: { gold18: 7400000, gold21: 8633333, gold22: 9044444, gold24: 9866667 }, source: "نرخ آزمایشی، غیرواقعی" }, $setOnInsert: { profitPercent: 7, taxPercent: 9 } }, { upsert: true });
  await Settings.findOneAndUpdate({ key: "main" }, { $setOnInsert: { salesEnabled: true, maxRateAgeMinutes: 1440 } }, { upsert: true, setDefaultsOnInsert: true });
  await Shipping.findOneAndUpdate({ name: "ارسال نمونه" }, { $setOnInsert: { cost: 80000, description: "روش آزمایشی؛ زمان و هزینه واقعی توسط فروشگاه تعیین می‌شود.", isActive: true } }, { upsert: true });
  const titles = { shipping: "ارسال و تحویل", returns: "شرایط بازگشت", privacy: "حریم خصوصی", terms: "شرایط خرید" };
  for (const [slug, title] of Object.entries(titles)) await Page.findOneAndUpdate({ slug }, { $setOnInsert: { title, body: "این یک فروشگاه نمایشی است و خرید واقعی در آن انجام نمی‌شود. سیاست‌های نهایی فروشگاه باید قبل از راه‌اندازی توسط مدیر ثبت و منتشر شوند.", published: true } }, { upsert: true });
  const phone = "09999999999";
  if (!await User.exists({ phonenumber: phone })) {
    const password = crypto.randomBytes(12).toString("base64url");
    await User.create({ firstname: "مدیر", lastname: "آلفا", phonenumber: phone, password, role: "admin", phoneVerifiedAt: new Date() });
    fs.mkdirSync(path.resolve(__dirname, "../artifacts"), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, "../artifacts/preview-admin.txt"), `LOCAL PREVIEW ONLY\nURL: http://127.0.0.1:${process.env.PORT || 3100}/login\nPhone: ${phone}\nSign in with the OTP displayed on the local login page.\n`);
  }
  console.log("Preview catalog ready. Local admin credentials: artifacts/preview-admin.txt");
}
module.exports = { seedPreview };
