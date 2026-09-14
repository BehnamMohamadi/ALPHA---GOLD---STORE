const path = require("node:path");

const mongoose = require("mongoose");

const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const { connectToDatabase } = require("../database/database-connection");

const Payment = require("../models/shopping-models/payment-model");

const Order = require("../models/shopping-models/order-model");

const { expireStalePayments } = require("../services/shopping-services/payment-service");

const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

const migrate = async () => {
  await connectToDatabase();

  console.log("[i] payment migration started...");

  const payments = await Payment.find({});

  let updatedPayments = 0;

  let updatedOrders = 0;

  for (const payment of payments) {
    const update = {};
    const pushHistory = [];

    /*
     * همه Paymentهای قدیمی باید
     * expiresAt داشته باشند؛ حتی Paidها.
     *
     * چون Model جدید required است.
     */
    if (!payment.expiresAt) {
      const baseTime = payment.createdAt ? payment.createdAt.getTime() : Date.now();

      update.expiresAt = new Date(baseTime + PAYMENT_WINDOW_MS);
    }

    /*
     * Review قدیمی.
     */
    if (
      payment.requiresReview === true &&
      (!payment.reviewStatus || payment.reviewStatus === "not_required")
    ) {
      update.reviewStatus = "pending";
    }

    /*
     * اگر قبلاً Resolution ثبت شده
     * ولی reviewStatus کامل نیست.
     */
    if (payment.resolution && payment.reviewStatus !== "resolved") {
      update.reviewStatus = "resolved";

      update.requiresReview = false;
    }

    /*
     * History قدیمی را فقط در صورت
     * خالی بودن می‌سازیم.
     */
    if (
      (payment.reviewReason || payment.requiresReview || payment.resolution) &&
      (!Array.isArray(payment.reviewHistory) || payment.reviewHistory.length === 0)
    ) {
      if (payment.reviewReason) {
        pushHistory.push({
          action: "opened",

          fromResolution: null,

          toResolution: null,

          reason: payment.reviewReason,

          actor: null,

          createdAt: payment.verifiedAt || payment.createdAt || new Date(),
        });
      }

      if (payment.resolution) {
        pushHistory.push({
          action: "resolved",

          fromResolution: null,

          toResolution: payment.resolution,

          reason: payment.reviewReason || null,

          actor: payment.resolvedBy || null,

          createdAt: payment.resolvedAt || payment.updatedAt || new Date(),
        });
      }
    }

    const mongoUpdate = {};

    if (Object.keys(update).length) {
      mongoUpdate.$set = update;
    }

    if (pushHistory.length) {
      mongoUpdate.$push = {
        reviewHistory: {
          $each: pushHistory,
        },
      };
    }

    if (Object.keys(mongoUpdate).length) {
      await Payment.collection.updateOne(
        {
          _id: payment._id,
        },

        mongoUpdate,
      );

      updatedPayments += 1;
    }

    /*
     * Orderهای قدیمی که Payment Pending
     * دارند ولی هنوز status=pending هستند.
     */
    if (["created", "pending"].includes(payment.status)) {
      const result = await Order.updateOne(
        {
          _id: payment.order,

          status: "pending",

          paymentStatus: "pending",
        },

        {
          $set: {
            status: "payment_pending",
          },
        },
      );

      updatedOrders += result.modifiedCount || 0;
    }

    /*
     * Paid + Review قدیمی باید Order
     * را در وضعیت review نگه دارد.
     */
    if (
      payment.status === "paid" &&
      payment.requiresReview === true &&
      !payment.resolution
    ) {
      const result = await Order.updateOne(
        {
          _id: payment.order,
        },

        {
          $set: {
            status: "review",

            paymentStatus: "paid",
          },
        },
      );

      updatedOrders += result.modifiedCount || 0;
    }

    /*
     * Resolutionهای قدیمی فقط State
     * Order را هماهنگ می‌کنند.
     *
     * عمداً Stock را تغییر نمی‌دهیم چون
     * نمی‌توانیم بفهمیم قبلاً کم شده یا نه.
     */
    if (payment.resolution === "stock_supplied") {
      const result = await Order.updateOne(
        {
          _id: payment.order,
        },

        {
          $set: {
            status: "confirmed",

            paymentStatus: "paid",
          },
        },
      );

      updatedOrders += result.modifiedCount || 0;
    }

    if (payment.resolution === "refunded") {
      const result = await Order.updateOne(
        {
          _id: payment.order,
        },

        {
          $set: {
            status: "cancelled",

            paymentStatus: "refunded",
          },
        },
      );

      updatedOrders += result.modifiedCount || 0;
    }
  }

  /*
   * حالا Paymentهای Pending قدیمی که
   * 10 دقیقه‌شان گذشته Expire شوند.
   */
  const expiredCount = await expireStalePayments();

  console.log(`[+] payments migrated: ${updatedPayments}`);

  console.log(`[+] orders synchronized: ${updatedOrders}`);

  console.log(`[+] stale payments expired: ${expiredCount}`);

  console.log("[+] payment migration completed.");
};

migrate()
  .catch((error) => {
    console.error("[-] payment migration failed:", error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
