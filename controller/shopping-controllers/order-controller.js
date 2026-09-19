const Order = require("../../models/shopping-models/order-model");

const Payment = require("../../models/shopping-models/payment-model");

const { prepareCurrentOrder } = require("../../services/shopping-services/order-service");

const { ApiFeatures } = require("../../utils/api-features");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

// Customer account shows only orders that reached the real post-payment lifecycle.
// Draft quotes, in-progress payment records and expired orders stay available to admins only.
const CUSTOMER_VISIBLE_ORDER_STATUSES = [
  "review",
  "confirmed",
  "shipped",
  "delivered",
];

const customerOrderFilter = (userId) => ({
  user: userId,
  status: { $in: CUSTOMER_VISIBLE_ORDER_STATUSES },
});

const prepareOrder = catchAsync(async (req, res) => {
  const { order, created } = await prepareCurrentOrder(
    req.user._id,

    req.body?.addressId || null,
    req.body?.shippingMethodId || null,
  );

  res.status(created ? 201 : 200).json({
    status: "success",

    data: {
      order,
    },
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const query = {
    ...req.query,
  };

  delete query.user;
  delete query.status;

  const baseFilter = customerOrderFilter(req.user._id);

  const features = new ApiFeatures(
    Order.find(baseFilter),

    query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  const total = await Order.countDocuments({
    ...features.filterObject,
    ...baseFilter,
  });

  res.status(200).json({
    status: "success",

    page: features.page,

    perPage: features.limit,

    total,

    totalPages: Math.ceil(total / features.limit),

    results: orders.length,

    data: {
      orders,
    },
  });
});

const getMyOrderHistory = catchAsync(async (req, res) => {
  const query = {
    ...req.query,
  };

  delete query.user;
  delete query.status;

  const baseFilter = customerOrderFilter(req.user._id);

  const features = new ApiFeatures(
    Order.find(baseFilter),

    query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  const total = await Order.countDocuments({
    ...features.filterObject,
    ...baseFilter,
  });

  res.status(200).json({
    status: "success",

    page: features.page,

    perPage: features.limit,

    total,

    totalPages: Math.ceil(total / features.limit),

    results: orders.length,

    data: {
      orders,
    },
  });
});

const getMyOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,

    ...customerOrderFilter(req.user._id),
  });

  if (!order) {
    return next(new AppError(404, "order not found", null, "ORDER_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",

    data: {
      order,
    },
  });
});

const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,

    user: req.user._id,
  });

  if (!order) {
    return next(new AppError(404, "order not found", null, "ORDER_NOT_FOUND"));
  }

  if (order.status !== "pending") {
    return next(
      new AppError(
        400,

        "only pending order can be cancelled",

        null,

        "ORDER_NOT_CANCELLABLE",
      ),
    );
  }

  if (order.paymentStatus === "pending") {
    return next(
      new AppError(
        400,

        "order with pending payment cannot be cancelled",

        null,

        "PAYMENT_ALREADY_IN_PROGRESS",
      ),
    );
  }

  if (order.paymentStatus === "paid") {
    return next(
      new AppError(
        400,

        "paid order cannot be cancelled",

        null,

        "ORDER_ALREADY_PAID",
      ),
    );
  }

  order.status = "cancelled";

  await order.save({
    validateModifiedOnly: true,
  });

  res.status(204).send();
});

const getAllOrders = catchAsync(async (req, res) => {
  const features = new ApiFeatures(
    Order.find().populate(
      "user",
      ["firstname", "lastname", "phonenumber", "email"].join(" "),
    ),

    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  const total = await Order.countDocuments(features.filterObject);

  const orderIds = orders.map((order) => order._id);

  const activeReviews = orderIds.length
    ? await Payment.find({
        order: {
          $in: orderIds,
        },

        status: "paid",

        requiresReview: true,

        reviewStatus: {
          $in: ["pending", "resolving"],
        },
      })
        .select(
          ["order", "reviewReason", "reviewStatus", "referenceId", "authority"].join(" "),
        )
        .lean()
    : [];

  const reviewMap = new Map(
    activeReviews.map((payment) => [String(payment.order), payment]),
  );

  const ordersWithReview = orders.map((order) => {
    const plain = order.toObject();

    const review = reviewMap.get(String(order._id));

    plain.paymentReview = review
      ? {
          active: true,

          paymentId: review._id,

          status: review.reviewStatus,

          reason: review.reviewReason,

          referenceId: review.referenceId,

          authority: review.authority,
        }
      : {
          active: false,
        };

    return plain;
  });

  res.status(200).json({
    status: "success",

    page: features.page,

    perPage: features.limit,

    total,

    totalPages: Math.ceil(total / features.limit),

    results: ordersWithReview.length,

    data: {
      orders: ordersWithReview,
    },
  });
});

const getOrderForAdmin = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId).populate(
    "user",
    ["firstname", "lastname", "phonenumber", "email", "role", "accountStatus"].join(" "),
  );

  if (!order) {
    return next(new AppError(404, "order not found", null, "ORDER_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",

    data: {
      order,
    },
  });
});

const updateOrderForAdmin = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return next(new AppError(404, "order not found", null, "ORDER_NOT_FOUND"));
  }

  if (req.body.status === "confirmed") {
    const activeReview = await Payment.exists({
      order: order._id,

      status: "paid",

      requiresReview: true,

      reviewStatus: {
        $in: ["pending", "resolving"],
      },
    });

    if (activeReview) {
      return next(
        new AppError(
          409,

          "payment review must be resolved before confirming this order",

          null,

          "PAYMENT_REVIEW_REQUIRED",
        ),
      );
    }
  }

  const allowed = { pending: ["cancelled"], confirmed: ["shipped"], shipped: ["delivered"] };
  if (!allowed[order.status]?.includes(req.body.status)) return next(new AppError(409, "تغییر وضعیت سفارش مجاز نیست."));
  if (["shipped", "delivered"].includes(req.body.status) && order.paymentStatus !== "paid") return next(new AppError(409, "سفارش پرداخت نشده است."));
  if (req.body.status === "shipped" && !req.body.trackingCode) return next(new AppError(400, "کد رهگیری الزامی است."));
  order.trackingCode = req.body.trackingCode || order.trackingCode;
  order.carrier = req.body.carrier || order.carrier;
  if (req.body.status === "shipped") order.shippedAt = new Date();
  if (req.body.status === "delivered") order.deliveredAt = new Date();
  order.status = req.body.status;

  await order.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",

    data: {
      order,
    },
  });
});

module.exports = {
  prepareOrder,
  getMyOrders,
  getMyOrderHistory,
  getMyOrder,
  cancelOrder,
  getAllOrders,
  getOrderForAdmin,
  updateOrderForAdmin,
};
