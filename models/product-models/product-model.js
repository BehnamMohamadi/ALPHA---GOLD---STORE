const { Schema, model } = require("mongoose");

const { createSlug } = require("../../utils/slugify");

const productSchema = new Schema(
  {
    catalogType: { type: String, enum: ["crafted_gold", "bullion", "silver", "coin"], default: "crafted_gold" },
    name: {
      type: String,
      required: [true, "product name is required"],
      trim: true,
      minlength: [2, "product name must be at least 2 characters"],
      maxlength: [100, "product name must be maximum 100 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    sku: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      required: [true, "product sku is required"],
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "category is required"],
    },

    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
      required: [true, "subcategory is required"],
    },

    gender: {
      type: String,
      enum: {
        values: ["female", "male", "kids", "unisex"],
        message: "invalid gender",
      },
      required: [true, "gender is required"],
    },

    goldWeight: {
      type: Number,
      required: [true, "gold weight is required"],
      min: [0.01, "gold weight must be greater than zero"],
    },

    karat: {
      type: Number,
      enum: {
        values: [18, 21, 22, 24],
        message: "invalid karat",
      },
      default: 18,
      required: true,
    },

    wage: {
      type: {
        type: String,
        enum: {
          values: ["percent", "fixed"],
          message: "invalid wage type",
        },
        default: "percent",
      },
      value: {
        type: Number,
        default: 0,
        min: [0, "wage cannot be negative"],
      },
    },

    accessoriesPrice: {
      type: Number,
      default: 0,
      min: [0, "accessories price cannot be negative"],
    },

    pricing: {
      mode: {
        type: String,
        enum: {
          values: ["standard", "custom"],
          message: "invalid pricing mode",
        },
        default: "standard",
      },

      profitPercent: {
        type: Number,
        default: null,
        min: [0, "profit percent cannot be negative"],
      },

      taxPercent: {
        type: Number,
        default: null,
        min: [0, "tax percent cannot be negative"],
      },

      wageEnabled: {
        type: Boolean,
        default: true,
      },
    },

    details: [
      {
        title: {
          type: String,
          required: [true, "detail title is required"],
          trim: true,
        },

        value: {
          type: String,
          required: [true, "detail value is required"],
          trim: true,
        },
        _id: false,
      },
    ],

    stock: {
      type: Number,
      default: 0,
      min: [0, "stock cannot be negative"],
    },

    coverImage: {
      type: String,
      default:
        "/images/models-images/product-images/product-images/product-cover-image-default.webp",
    },

    images: {
      type: [String],

      default: [
        "/images/models-images/product-images/product-images/product-image-default.webp",
      ],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "description must be maximum 5000 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

productSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = createSlug(this.name);
  }
});

module.exports = model("Product", productSchema);
