const Product = require("../../models/product-models/product-model");
const Category = require("../../models/product-models/category-model");
const SubCategory = require("../../models/product-models/subCategory-model");

const { ApiFeatures } = require("../../utils/api-features");
const { AppError } = require("../../utils/app-error");
const { catchAsync } = require("../../utils/catch-async");

// Admin list: unlike public GET /api/products, inactive products are included.
const getAllProductsForAdmin = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [products, total] = await Promise.all([
    features.query
      .populate("category", "name slug icon isActive")
      .populate("subCategory", "name slug icon isActive"),

    Product.countDocuments({
      ...features.filterObject,
    }),
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    pagination: {
      page: features.page,
      limit: features.limit,
      total,
      pages: Math.ceil(total / features.limit),
    },
    data: {
      products,
    },
  });
});

// Admin item: inactive products are also editable.
const getProductByIdForAdmin = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId)
    .populate("category", "name slug icon isActive")
    .populate("subCategory", "name slug icon isActive");

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Admin category list: inactive categories stay visible in the admin panel.
const getAllCategoriesForAdmin = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Category.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [categories, total] = await Promise.all([
    features.query,
    Category.countDocuments({
      ...features.filterObject,
    }),
  ]);

  res.status(200).json({
    status: "success",
    page: features.page,
    perPage: features.limit,
    total,
    totalPages: Math.ceil(total / features.limit),
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Admin subcategory list: inactive subcategories stay visible in the admin panel.
const getAllSubCategoriesForAdmin = catchAsync(async (req, res) => {
  const features = new ApiFeatures(SubCategory.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [subCategories, total] = await Promise.all([
    features.query.populate("category", "name slug isActive"),
    SubCategory.countDocuments({
      ...features.filterObject,
    }),
  ]);

  res.status(200).json({
    status: "success",
    page: features.page,
    perPage: features.limit,
    total,
    totalPages: Math.ceil(total / features.limit),
    results: subCategories.length,
    data: {
      subCategories,
    },
  });
});

module.exports = {
  getAllProductsForAdmin,
  getProductByIdForAdmin,
  getAllCategoriesForAdmin,
  getAllSubCategoriesForAdmin,
};
