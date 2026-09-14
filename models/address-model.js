const { Schema, model } = require("mongoose");

const addressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "address title is required"],
      trim: true,
      maxlength: [40, "address title must be maximum 40 characters"],
    },

    recipientName: {
      type: String,
      required: [true, "recipient name is required"],
      trim: true,
      maxlength: [80, "recipient name must be maximum 80 characters"],
    },

    recipientPhone: {
      type: String,
      required: [true, "recipient phone is required"],
      trim: true,
      match: [/^09\d{9}$/, "invalid recipient phone"],
    },

    province: {
      type: String,
      required: [true, "province is required"],
      trim: true,
      maxlength: [60, "province must be maximum 60 characters"],
    },

    city: {
      type: String,
      required: [true, "city is required"],
      trim: true,
      maxlength: [60, "city must be maximum 60 characters"],
    },

    addressLine: {
      type: String,
      required: [true, "address line is required"],
      trim: true,
      maxlength: [500, "address line must be maximum 500 characters"],
    },

    postalCode: {
      type: String,
      required: [true, "postal code is required"],
      trim: true,
      match: [/^\d{10}$/, "postal code must be exactly 10 digits"],
    },

    buildingNumber: {
      type: String,
      trim: true,
      maxlength: [20, "building number must be maximum 20 characters"],
      default: "",
    },

    unit: {
      type: String,
      trim: true,
      maxlength: [20, "unit must be maximum 20 characters"],
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

addressSchema.index({ user: 1, isDefault: -1, createdAt: -1 });

addressSchema.pre("validate", function () {
 const { text } = require("../utils/normalize");
 const provinces = require("../data/locations.json");
 this.province = text(this.province); this.city = text(this.city);
 const province = provinces.find(p => p.name === this.province);
 if (!province) this.invalidate("province", "استان معتبر انتخاب کنید.");
 else if (!province.cities.includes(this.city)) this.invalidate("city", "شهر باید متعلق به استان انتخاب‌شده باشد.");
});

module.exports = model("Address", addressSchema);
