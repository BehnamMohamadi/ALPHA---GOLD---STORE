const { Schema, model } = require("mongoose");

const reviewHistorySchema = new Schema(
  {
    action: {
      type: String,

      enum: {
        values: ["opened", "resolved", "resolution_changed"],

        message: "invalid review history action",
      },

      required: true,
    },

    fromResolution: {
      type: String,

      enum: {
        values: ["stock_supplied", "refunded", null],

        message: "invalid previous review resolution",
      },

      default: null,
    },

    toResolution: {
      type: String,

      enum: {
        values: ["stock_supplied", "refunded", null],

        message: "invalid review resolution",
      },

      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: null,

      maxlength: [500, "review history reason is too long"],
    },

    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",

      required: [true, "user is required"],

      index: true,
    },

    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",

      required: [true, "order is required"],

      index: true,
    },

    gateway: {
      type: String,

      enum: {
        values: ["mock", "zarinpal"],

        message: "invalid payment gateway",
      },

      required: [true, "payment gateway is required"],
    },

    amount: {
      type: Number,

      required: [true, "payment amount is required"],

      min: [1, "payment amount must be greater than zero"],
    },

    gatewayAmount: {
      type: Number,

      required: [true, "gateway amount is required"],

      min: [1, "gateway amount must be greater than zero"],
    },

    status: {
      type: String,

      enum: {
        values: [
          "created",
          "pending",
          "processing",
          "paid",
          "failed",
          "cancelled",
          "expired",
          "refunded",
        ],

        message: "invalid payment status",
      },

      default: "created",
    },

    expiresAt: {
      type: Date,

      required: [true, "payment expiration is required"],

      index: true,
    },

    authority: {
      type: String,
      trim: true,
      default: null,
    },

    referenceId: {
      type: String,
      trim: true,
      default: null,
    },

    cardPan: {
      type: String,
      trim: true,
      default: null,
    },

    cardHash: {
      type: String,
      trim: true,
      default: null,
    },

    gatewayCode: {
      type: Number,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      default: null,

      maxlength: [500, "failure reason is too long"],
    },

    requiresReview: {
      type: Boolean,
      default: false,
    },

    reviewReason: {
      type: String,
      trim: true,
      default: null,

      maxlength: [500, "review reason is too long"],
    },

    reviewStatus: {
      type: String,

      enum: {
        values: ["not_required", "pending", "resolving", "resolved"],

        message: "invalid payment review status",
      },

      default: "not_required",
    },

    resolution: {
      type: String,

      enum: {
        values: ["stock_supplied", "refunded", null],

        message: "invalid payment resolution",
      },

      default: null,
    },

    reviewHistory: {
      type: [reviewHistorySchema],

      default: [],
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index(
  {
    authority: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      authority: {
        $type: "string",
      },
    },
  },
);

paymentSchema.index({
  order: 1,
  createdAt: -1,
});

paymentSchema.index({
  user: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
  expiresAt: 1,
});

paymentSchema.index({
  requiresReview: 1,
  reviewStatus: 1,
  createdAt: -1,
});

module.exports = model("Payment", paymentSchema);
