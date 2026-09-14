const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Cart = require("../../models/shopping-models/cart-model");
const Order = require("../../models/shopping-models/order-model");
const Address = require("../../models/address-model");
const User = require("../../models/user-model");
const Category = require("../../models/product-models/category-model");
const SubCategory = require("../../models/product-models/subCategory-model");
const GoldPricing = require("../../models/product-models/GoldPricing-model");
const { Settings, Shipping } = require("../../models/store-models");
const { calculateProductPrice, rateIsFresh } = require("../product-services/pricing-service");
const { AppError } = require("../../utils/app-error");
async function prepareCurrentOrder(userId, addressId, shippingMethodId) {
  return mongoose.connection.transaction(async session => {
    const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { __v: 1 } }, { returnDocument: "after", session });
    if (!user?.profileCompleted || !user.phoneVerifiedAt) throw new AppError(400, "ابتدا شماره موبایل و اطلاعات حساب را تکمیل کنید.");
    const settings = await Settings.findOne({ key: "main" }).session(session);
    if (!settings?.salesEnabled) throw new AppError(503, "ثبت سفارش موقتاً غیرفعال است.");
    const rate = await GoldPricing.findOne({ key: "main" }).session(session);
    if (!rateIsFresh(rate, settings.maxRateAgeMinutes)) throw new AppError(503, "نرخ طلا نیاز به به‌روزرسانی دارد. کمی بعد دوباره تلاش کنید.");
    const address = await Address.findOne({ user: userId, ...(addressId ? { _id: addressId } : { isDefault: true }) }).session(session);
    if (!address) throw new AppError(400, "آدرس ارسال را انتخاب کنید.");
    const method = shippingMethodId && await Shipping.findOne({ _id: shippingMethodId, isActive: true }).session(session);
    if (!method || (method.provinces.length && !method.provinces.includes(address.province))) throw new AppError(400, "روش ارسال برای این آدرس در دسترس نیست.");
    const cart = await Cart.findOne({ user: userId }).populate("items.product").session(session);
    if (!cart?.items.length) throw new AppError(400, "سبد خرید خالی است.");
    const items = [];
    for (const item of cart.items) {
      const p = item.product;
      if (!p || !p.isActive || p.stock < item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) throw new AppError(409, "موجودی یکی از محصولات تغییر کرده است.");
      if (!await Category.exists({ _id: p.category, isActive: true }).session(session) || !await SubCategory.exists({ _id: p.subCategory, category: p.category, isActive: true }).session(session)) throw new AppError(409, "محصول دیگر قابل فروش نیست.");
      const pricing = calculateProductPrice({ product: p, goldPricing: rate });
      items.push({ product: p._id, productSnapshot: { name: p.name, slug: p.slug, sku: p.sku, coverImage: p.coverImage }, quantity: item.quantity, pricingSnapshot: pricing, unitPrice: pricing.finalPrice, totalPrice: pricing.finalPrice * item.quantity });
    }
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingCost = method.freeAbove !== null && subtotal >= method.freeAbove ? 0 : method.cost;
    if (!Number.isSafeInteger(subtotal + shippingCost)) throw new AppError(400, "مبلغ سفارش معتبر نیست.");
    const values = { quoteId: crypto.randomUUID(), items, subtotal, shippingCost, totalAmount: subtotal + shippingCost,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0), currency: "IRT", cartVersion: cart.__v,
      shippingAddressSnapshot: { ...address.toObject(), addressId: address._id },
      shippingMethodSnapshot: { id: method._id, name: method.name, description: method.description },
      priceExpiresAt: new Date(Date.now() + 120000), paymentStatus: "unpaid" };
    let order = await Order.findOne({ user: userId, status: "pending", paymentStatus: { $in: ["unpaid", "failed"] } }).session(session);
    const created = !order;
    if (order) { Object.assign(order, values); await order.save({ session }); }
    else [order] = await Order.create([{ ...values, orderNumber: `ALP-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, user: userId }], { session });
    return { order, created };
  });
}
async function getCurrentOrder(userId) { const order = await Order.findOne({ user: userId, status: "pending" }); if (!order) throw new AppError(404, "سفارش پیدا نشد."); return order; }
module.exports = { prepareCurrentOrder, getCurrentOrder };
