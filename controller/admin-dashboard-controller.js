const User = require("../models/user-model");
const Product = require("../models/product-models/product-model");
const Order = require("../models/shopping-models/order-model");
const Cart = require("../models/shopping-models/cart-model");
const GoldPricing = require("../models/product-models/GoldPricing-model");

const { catchAsync } = require("../utils/catch-async");

const getAdminDashboard = catchAsync(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    deactivatedUsers,
    totalProducts,
    activeProducts,
    inactiveProducts,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    confirmedOrders,
    cancelledOrders,
    shippedOrders,
    paidOrders,
    totalCarts,
    salesResult,
    latestOrders,
    goldPricing,
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({
      "accountStatus.status": "active",
    }),

    User.countDocuments({
      "accountStatus.status": "suspended",
    }),

    User.countDocuments({
      "accountStatus.status": "deactivated",
    }),

    Product.countDocuments(),

    Product.countDocuments({
      isActive: true,
    }),

    Product.countDocuments({
      isActive: false,
    }),

    Product.find({
      isActive: true,
      stock: { $lte: 3 },
    })
      .select("name sku stock coverImage goldWeight karat")
      .sort({
        stock: 1,
        createdAt: -1,
      })
      .limit(8),

    Order.countDocuments(),

    Order.countDocuments({
      status: "pending",
    }),

    Order.countDocuments({
      status: "confirmed",
    }),

    Order.countDocuments({
      status: "cancelled",
    }),

    Order.countDocuments({
      status: "shipped",
    }),

    Order.countDocuments({
      paymentStatus: "paid",
    }),

    Cart.countDocuments(),

    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: "$totalAmount",
          },
        },
      },
    ]),

    Order.find()
      .populate("user", "firstname lastname phonenumber email")
      .sort({
        createdAt: -1,
      })
      .limit(7),

    GoldPricing.findOne({
      key: "main",
    }).populate("updatedBy", "firstname lastname"),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      dashboard: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          deactivated: deactivatedUsers,
        },

        products: {
          total: totalProducts,
          active: activeProducts,
          inactive: inactiveProducts,
          lowStock: lowStockProducts,
        },

        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          cancelled: cancelledOrders,
          unshipped: confirmedOrders,
          undelivered: shippedOrders,
          paid: paidOrders,
        },

        carts: {
          total: totalCarts,
        },

        sales: {
          paidTotal: salesResult[0]?.totalSales || 0,
        },

        latestOrders,

        goldPricing,
      },
    },
  });
});

module.exports = {
  getAdminDashboard,
};
