const { Schema, model } = require("mongoose");

const { createSlug } = require("../../utils/slugify");

const subCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "subcategory name is required"],
      trim: true,
      minlength: [2, "subcategory name must be at least 2 characters"],
      maxlength: [50, "subcategory name must be maximum 50 characters"],
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "category is required"],
    },

    icon: {
      type: String,
      default:
        "/images/models-images/product-images/sub-category-images/sub-category-image-default.webp",
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

subCategorySchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = createSlug(this.name);
  }
});

subCategorySchema.index(
  {
    category: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

module.exports = model("SubCategory", subCategorySchema);
