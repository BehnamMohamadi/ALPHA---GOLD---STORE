const { Schema, model } = require("mongoose");

const goldPricingSchema = new Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
      immutable: true,
    },

    prices: {
      gold18: {
        type: Number,
        default: null,
        min: [0, "18k gold price cannot be negative"],
      },

      gold21: {
        type: Number,
        default: null,
        min: [0, "21k gold price cannot be negative"],
      },

      gold22: {
        type: Number,
        default: null,
        min: [0, "22k gold price cannot be negative"],
      },

      gold24: {
        type: Number,
        default: null,
        min: [0, "24k gold price cannot be negative"],
      },
    },

    profitPercent: {
      type: Number,
      default: 7,
      min: [0, "profit percent cannot be negative"],
    },

    taxPercent: {
      type: Number,
      default: 9,
      min: [0, "tax percent cannot be negative"],
    },

    source: {
      type: String,
      trim: true,
      default: "manual",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = model("GoldPricing", goldPricingSchema);
