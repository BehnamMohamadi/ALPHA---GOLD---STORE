const Payment = require("../../models/shopping-models/payment-model");

const {
  startPayment,
  handleZarinpalCallback,
  completeMockPayment,
  expireStalePayments,
  resolvePaymentReview,
} = require("../../services/shopping-services/payment-service");

const { ApiFeatures } = require("../../utils/api-features");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const createPayment = catchAsync(async (req, res) => {
  const result = await startPayment({
    user: req.user,

    orderId: req.params.orderId,
    quoteId: req.body?.quoteId,
  });

  res.status(201).json({
    status: "success",

    data: result,
  });
});

const zarinpalCallback = catchAsync(async (req, res) => {
  const result = await handleZarinpalCallback({
    authority: req.query.Authority || req.query.authority,

    status: req.query.Status || req.query.status,
  });

  const payment = await Payment.findOne({ authority: req.query.Authority || req.query.authority });
  if (req.accepts("html")) return res.redirect("/payment/result" + (payment ? "?id=" + payment._id : ""));
  res.status(200).json({ status: "success", data: result });
});

const mockPaymentSuccess = catchAsync(async (req, res) => {
  const payment = await completeMockPayment({
    paymentId: req.params.paymentId,

    userId: req.user._id,
  });

  res.status(200).json({
    status: "success",

    data: {
      payment,
    },
  });
});

const getMyPayments = catchAsync(async (req, res) => {
  await expireStalePayments();

  const query = {
    ...req.query,
  };

  delete query.user;
  delete query.order;
  delete query.requiresReview;
  delete query.reviewStatus;

  const features = new ApiFeatures(
    Payment.find({
      user: req.user._id,
    }).populate(
      "order",
      ["orderNumber", "status", "paymentStatus", "totalAmount"].join(" "),
    ),

    query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const payments = await features.query;

  const total = await Payment.countDocuments({
    ...features.filterObject,

    user: req.user._id,
  });

  res.status(200).json({
    status: "success",

    page: features.page,

    perPage: features.limit,

    total,

    totalPages: Math.ceil(total / features.limit),

    results: payments.length,

    data: {
      payments,
    },
  });
});

const getMyPayment = catchAsync(async (req, res, next) => {
  await expireStalePayments();

  const payment = await Payment.findOne({
    _id: req.params.paymentId,

    user: req.user._id,
  }).populate(
    "order",
    ["orderNumber", "status", "paymentStatus", "totalAmount"].join(" "),
  );

  if (!payment) {
    return next(new AppError(404, "payment not found", null, "PAYMENT_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",

    data: {
      payment,
    },
  });
});

const getAllPayments = catchAsync(async (req, res) => {
  await expireStalePayments();

  const features = new ApiFeatures(
    Payment.find()
      .populate("user", ["firstname", "lastname", "phonenumber", "email"].join(" "))
      .populate(
        "order",
        ["orderNumber", "status", "paymentStatus", "totalAmount"].join(" "),
      )
      .populate("resolvedBy", ["firstname", "lastname", "email"].join(" "))
      .populate("reviewHistory.actor", ["firstname", "lastname", "email"].join(" ")),

    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const payments = await features.query;

  const total = await Payment.countDocuments(features.filterObject);

  res.status(200).json({
    status: "success",

    page: features.page,

    perPage: features.limit,

    total,

    totalPages: Math.ceil(total / features.limit),

    results: payments.length,

    data: {
      payments,
    },
  });
});

const getOrderPaymentsForAdmin = catchAsync(async (req, res) => {
  await expireStalePayments();

  const payments = await Payment.find({
    order: req.params.orderId,
  })
    .populate("user", ["firstname", "lastname", "phonenumber", "email"].join(" "))
    .populate("resolvedBy", ["firstname", "lastname", "email"].join(" "))
    .populate("reviewHistory.actor", ["firstname", "lastname", "email"].join(" "))
    .sort("-createdAt");

  res.status(200).json({
    status: "success",

    results: payments.length,

    data: {
      payments,
    },
  });
});

const resolvePaymentForAdmin = catchAsync(async (req, res) => {
  const payment = await resolvePaymentReview({
    paymentId: req.params.paymentId,

    adminUserId: req.user._id,

    resolution: req.body.resolution,
  });

  await payment.populate([
    {
      path: "resolvedBy",

      select: "firstname lastname email",
    },

    {
      path: "reviewHistory.actor",

      select: "firstname lastname email",
    },
  ]);

  res.status(200).json({
    status: "success",

    message: "payment review updated successfully",

    data: {
      payment,
    },
  });
});

module.exports = {
  createPayment,
  zarinpalCallback,
  mockPaymentSuccess,
  getMyPayments,
  getMyPayment,
  getAllPayments,
  getOrderPaymentsForAdmin,
  resolvePaymentForAdmin,
};
