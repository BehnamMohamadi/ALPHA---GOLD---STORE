const { Schema, model } = require("mongoose");

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "product is required"],
    },

    quantity: {
      type: Number,
      default: 1,
      min: [1, "quantity must be at least 1"],
    },
  },
  {
    _id: false,
  },
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is required"],
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

module.exports = model("Cart", cartSchema);
