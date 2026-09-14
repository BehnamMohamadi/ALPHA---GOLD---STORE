const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Payment = require('../../models/shopping-models/payment-model');
const Order = require('../../models/shopping-models/order-model');
const Product = require('../../models/product-models/product-model');
const Category = require('../../models/product-models/category-model');
const SubCategory = require('../../models/product-models/subCategory-model');
const Cart = require('../../models/shopping-models/cart-model');
const User = require('../../models/user-model');
const { Settings } = require('../../models/store-models');
const gatewayApi = require('./zarinpal-service');
const { AppError } = require('../../utils/app-error');
const WINDOW = 10 * 60 * 1000;
let expirationTimer, sweeping = false;
const fail = (message, code, status = 409) => new AppError(status, message, null, code);
function config() {
  const gateway = process.env.PAYMENT_GATEWAY || 'mock';
  if (!['mock', 'zarinpal'].includes(gateway)) throw fail('تنظیم درگاه معتبر نیست.', 'INVALID_PAYMENT_GATEWAY', 503);
  if (gateway === 'mock' && !['development', 'test'].includes(process.env.NODE_ENV)) throw fail('درگاه آزمایشی در محیط عملیاتی مجاز نیست.', 'MOCK_GATEWAY_DISABLED', 403);
  const multiplier = Number(process.env.PAYMENT_AMOUNT_MULTIPLIER || 10);
  if (![1, 10].includes(multiplier)) throw fail('ضریب تبدیل مبلغ معتبر نیست.', 'INVALID_PAYMENT_MULTIPLIER', 503);
  if (gateway === 'zarinpal' && !process.env.ZARINPAL_MERCHANT_ID) throw fail('درگاه پرداخت هنوز پیکربندی نشده است.', 'GATEWAY_NOT_CONFIGURED', 503);
  return { gateway, multiplier };
}
async function reserveStock(order, session) {
  for (const item of order.items) {
    const p = await Product.findOne({ _id: item.product, isActive: true }).session(session);
    if (!p || (p.catalogType && p.catalogType !== 'crafted_gold')) throw fail('محصول دیگر قابل فروش نیست.', 'PRODUCT_INACTIVE');
    if (!await Category.exists({ _id: p.category, isActive: true }).session(session) || !await SubCategory.exists({ _id: p.subCategory, category: p.category, isActive: true }).session(session)) throw fail('دسته محصول غیرفعال شده است.', 'PRODUCT_INACTIVE');
    const result = await Product.updateOne({ _id: p._id, stock: { $gte: item.quantity }, isActive: true }, { $inc: { stock: -item.quantity } }, { session });
    if (!result.modifiedCount) throw new AppError(409, `موجودی «${p.name}» کافی نیست.`, { productName: p.name }, 'INSUFFICIENT_STOCK');
  }
  order.stockReserved = true;
}
async function releaseStock(order, session) {
  if (!order?.stockReserved) return;
  for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
  order.stockReserved = false;
}
async function expireStalePayments() {
  // Old records without a deadline are normalized once, without changing paid records.
  await Payment.updateMany({ status: { $in: ['created', 'pending'] }, expiresAt: null }, [{ $set: { expiresAt: { $add: ['$createdAt', WINDOW] } } }], { updatePipeline: true });
  const candidates = await Payment.find({ status: { $in: ['created', 'pending'] }, expiresAt: { $lte: new Date() } }).select('_id').limit(200).lean();
  let count = 0;
  for (const candidate of candidates) count += await mongoose.connection.transaction(async session => {
    const p = await Payment.findOne({ _id: candidate._id, status: { $in: ['created', 'pending'] }, expiresAt: { $lte: new Date() } }).session(session);
    if (!p) return 0;
    const order = await Order.findById(p.order).session(session);
    if (order && order.status === 'payment_pending') { await releaseStock(order, session); order.status = 'expired'; order.paymentStatus = 'failed'; await order.save({ session }); }
    p.status = 'expired'; p.failureReason = 'payment window expired'; await p.save({ session }); return 1;
  });
  return count;
}
function startPaymentExpirationWorker() {
  if (expirationTimer) return;
  const tick = async () => { if (sweeping) return; sweeping = true; try { await expireStalePayments(); } catch (e) { console.error('Payment expiration:', e.message); } finally { sweeping = false; } };
  tick(); expirationTimer = setInterval(tick, 15000); expirationTimer.unref();
}
async function failAttempt(paymentId, reason, status = 'failed') {
  return mongoose.connection.transaction(async session => {
    const p = await Payment.findById(paymentId).session(session);
    if (!p || ['paid', 'refunded'].includes(p.status)) return p;
    const order = await Order.findById(p.order).session(session);
    if (order?.status === 'payment_pending') {
      await releaseStock(order, session); order.status = 'expired'; order.paymentStatus = 'failed'; await order.save({ session });
    }
    p.status = status; p.failureReason = String(reason).slice(0, 500); await p.save({ session }); return p;
  });
}
async function startPayment({ user, orderId, quoteId }) {
  const { gateway, multiplier } = config();
  if (typeof quoteId !== 'string') throw fail('قیمت سفارش را دوباره دریافت و تأیید کنید.', 'QUOTE_CHANGED');
  await expireStalePayments();
  const { payment, order } = await mongoose.connection.transaction(async session => {
    // Serializes checkout/address/cart preparations for the same customer.
    await User.updateOne({ _id: user._id }, { $inc: { __v: 1 } }, { session });
    const settings = await Settings.findOne({ key: 'main' }).session(session);
    if (!settings?.salesEnabled) throw fail('ثبت سفارش موقتاً غیرفعال است.', 'SALES_PAUSED', 503);
    const o = await Order.findOne({ _id: orderId, user: user._id }).session(session);
    if (!o) throw fail('سفارش پیدا نشد.', 'ORDER_NOT_FOUND', 404);
    if (o.status !== 'pending' || !['unpaid', 'failed'].includes(o.paymentStatus)) throw fail('این سفارش قابل پرداخت نیست.', 'ORDER_NOT_PAYABLE');
    if (o.quoteId !== quoteId) throw fail('قیمت یا جزئیات سفارش تغییر کرده است. دوباره بازبینی کنید.', 'QUOTE_CHANGED');
    if (o.priceExpiresAt <= new Date()) throw fail('اعتبار قیمت تمام شده است. قیمت جدید را دریافت کنید.', 'ORDER_PRICE_EXPIRED');
    if (!o.shippingAddressSnapshot?.addressId || !o.shippingMethodSnapshot?.id) throw fail('آدرس و روش ارسال را انتخاب کنید.', 'SHIPPING_ADDRESS_REQUIRED', 400);
    const amount = Math.round(o.totalAmount * multiplier);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw fail('مبلغ سفارش معتبر نیست.', 'INVALID_AMOUNT', 400);
    await reserveStock(o, session); o.status = 'payment_pending'; o.paymentStatus = 'pending'; await o.save({ session });
    const [p] = await Payment.create([{ user: user._id, order: o._id, gateway, amount: o.totalAmount, gatewayAmount: amount, status: 'created', expiresAt: new Date(Date.now() + WINDOW) }], { session });
    return { payment: p, order: o };
  });
  try {
    const result = gateway === 'mock' ? { authority: `MOCK-${crypto.randomUUID()}`, code: 100, redirectUrl: null } : await gatewayApi.requestPayment({ amount: payment.gatewayAmount, callbackUrl: process.env.PAYMENT_CALLBACK_URL || `http://127.0.0.1:${process.env.PORT || 3000}/api/payments/zarinpal/callback`, description: `Alpha order ${order.orderNumber}`, mobile: user.phonenumber, email: user.email });
    const updated = await Payment.findOneAndUpdate({ _id: payment._id, status: 'created', expiresAt: { $gt: new Date() } }, { $set: { authority: result.authority, gatewayCode: result.code, status: 'pending' } }, { returnDocument: 'after' });
    if (!updated) throw fail('مهلت شروع پرداخت تمام شد.', 'PAYMENT_EXPIRED');
    // Do not erase products added from a second tab after this quote was prepared.
    await Cart.updateOne({ user: user._id, __v: order.cartVersion }, { $set: { items: [] }, $inc: { __v: 1 } });
    return { payment: updated, redirectUrl: result.redirectUrl, mockVerifyPath: gateway === 'mock' ? `/api/payments/mock/${payment._id}/success` : null };
  } catch (e) {
    // A gateway request timeout cannot prove that no authority was created. No funds are verified here.
    await failAttempt(payment._id, e.message); throw e;
  }
}
async function finalizeSuccessfulPayment(paymentId, result) {
  return mongoose.connection.transaction(async session => {
    const p = await Payment.findById(paymentId).session(session);
    if (!p) throw fail('پرداخت پیدا نشد.', 'PAYMENT_NOT_FOUND', 404);
    if (['paid', 'refunded'].includes(p.status)) return p;
    const order = await Order.findById(p.order).session(session);
    if (!order) throw fail('سفارش پرداخت پیدا نشد؛ نیاز به بررسی دارد.', 'ORDER_NOT_FOUND', 409);
    const late = p.expiresAt <= new Date() || ['expired', 'failed', 'cancelled'].includes(p.status) || order.status !== 'payment_pending';
    let reason = late ? 'payment was completed after the 10-minute payment window or after cancellation' : null;
    // Legacy payments created before inventory reservations are supported.
    if (!late && !order.stockReserved) {
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product?.isActive || product.stock < item.quantity) { reason = 'موجودی سفارش قدیمی نیاز به بررسی دارد.'; break; }
      }
      if (!reason) await reserveStock(order, session);
    }
    Object.assign(p, { status: 'paid', referenceId: result.referenceId || null, gatewayCode: result.code || null, cardPan: result.cardPan || null, cardHash: result.cardHash || null, verifiedAt: new Date(), failureReason: null });
    order.paymentStatus = 'paid';
    if (reason) {
      await releaseStock(order, session); order.status = 'review'; p.requiresReview = true; p.reviewStatus = 'pending'; p.reviewReason = reason;
      p.reviewHistory.push({ action: 'opened', reason });
    } else { order.stockReserved = false; order.stockConsumed = true; order.status = 'confirmed'; p.requiresReview = false; p.reviewStatus = 'not_required'; }
    await order.save({ session }); await p.save({ session }); return p;
  });
}
async function handleZarinpalCallback({ authority, status }) {
  if (typeof authority !== 'string' || authority.length > 150) throw fail('شناسه پرداخت معتبر نیست.', 'PAYMENT_AUTHORITY_REQUIRED', 400);
  const p = await Payment.findOne({ gateway: 'zarinpal', authority });
  if (!p) throw fail('پرداخت پیدا نشد.', 'PAYMENT_NOT_FOUND', 404);
  if (['paid', 'refunded'].includes(p.status)) return { payment: p, verified: true };
  if (String(status).toUpperCase() !== 'OK') return { payment: await failAttempt(p._id, 'payment cancelled by gateway', 'cancelled'), verified: false };
  // Verification transport failures are retriable; never label an unknown bank result as a successful or failed charge.
  const result = await gatewayApi.verifyPayment({ amount: p.gatewayAmount, authority });
  return { payment: await finalizeSuccessfulPayment(p._id, result), verified: true };
}
async function completeMockPayment({ paymentId, userId }) {
  if (!['development', 'test'].includes(process.env.NODE_ENV) || process.env.PAYMENT_GATEWAY !== 'mock') throw fail('پرداخت آزمایشی فعال نیست.', 'MOCK_GATEWAY_DISABLED', 403);
  const p = await Payment.findOne({ _id: paymentId, user: userId, gateway: 'mock' });
  if (!p) throw fail('پرداخت پیدا نشد.', 'PAYMENT_NOT_FOUND', 404);
  return finalizeSuccessfulPayment(p._id, { code: 100, referenceId: `MOCK-${p._id}` });
}
async function resolvePaymentReview({ paymentId, adminUserId, resolution }) {
  if (!['stock_supplied', 'refunded'].includes(resolution)) throw fail('نتیجه بررسی نامعتبر است.', 'INVALID_REVIEW_RESOLUTION', 400);
  return mongoose.connection.transaction(async session => {
    const p = await Payment.findById(paymentId).session(session);
    if (!p || !p.reviewHistory.length || !['paid', 'refunded'].includes(p.status)) throw fail('این پرداخت قابل بررسی نیست.', 'PAYMENT_REVIEW_NOT_FOUND');
    const order = await Order.findById(p.order).session(session);
    if (!order || ['shipped', 'delivered'].includes(order.status)) throw fail('نتیجه سفارش ارسال‌شده قابل تغییر نیست.', 'PAYMENT_REVIEW_NOT_EDITABLE');
    if (p.reviewStatus === 'resolved' && p.resolution === resolution) return p;
    // A recorded refund is terminal: supplying stock cannot pretend to charge the buyer again.
    if (p.status === 'refunded') throw fail('بازپرداخت ثبت‌شده قابل تبدیل به فروش نیست.', 'PAYMENT_REVIEW_NOT_EDITABLE');
    if (resolution === 'stock_supplied') { await reserveStock(order, session); order.stockReserved = false; order.stockConsumed = true; order.status = 'confirmed'; order.paymentStatus = 'paid'; }
    else {
      await releaseStock(order, session);
      if (order.stockConsumed) { for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session }); order.stockConsumed = false; }
      order.status = 'cancelled'; order.paymentStatus = 'refunded'; p.status = 'refunded';
    }
    p.reviewHistory.push({ action: p.resolution ? 'resolution_changed' : 'resolved', fromResolution: p.resolution, toResolution: resolution, actor: adminUserId, reason: resolution === 'refunded' ? 'Admin recorded a refund performed outside this application.' : 'Stock supplied.' });
    p.resolution = resolution; p.requiresReview = false; p.reviewStatus = 'resolved'; p.resolvedBy = adminUserId; p.resolvedAt = new Date();
    await order.save({ session }); await p.save({ session }); return p;
  });
}
module.exports = { startPayment, handleZarinpalCallback, completeMockPayment, expireStalePayments, startPaymentExpirationWorker, resolvePaymentReview, finalizeSuccessfulPayment };
