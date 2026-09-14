const { Schema, model } = require("mongoose");

const wishlistItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "product is required"],
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is required"],
      unique: true,
      index: true,
    },

    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  {
    optimisticConcurrency: true, timestamps: true,
  },
);

module.exports = model("Wishlist", wishlistSchema);
