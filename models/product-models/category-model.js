const { Schema, model } = require("mongoose");
const { createSlug } = require("../../utils/slugify");

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "category name must be at least 2 characters"],
      maxlength: [50, "category name must be maximum 50 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    icon: {
      type: String,
      default:
        "/images/models-images/product-images/category-images/category-image-default.webp",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "sort order cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = createSlug(this.name);
  }
});

module.exports = model("Category", categorySchema);
