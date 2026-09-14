const path = require("node:path");
const fs = require("node:fs/promises");

const sharp = require("sharp");

const Category = require("../../models/product-models/category-model");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const { ApiFeatures } = require("../../utils/api-features");

const { createSlug } = require("../../utils/slugify");

const DEFAULT_CATEGORY_ICON =
  "/images/models-images/product-images/category-images/category-image-default.webp";

const CATEGORY_IMAGES_DIRECTORY = path.join(
  __dirname,
  "../../public/images/models-images/product-images/category-images",
);

// GET ALL CATEGORIES - PUBLIC
const getAllCategories = catchAsync(async (req, res) => {
  const features = new ApiFeatures(
    Category.find({
      isActive: true,
    }),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [categories, total] = await Promise.all([
    features.query,

    Category.countDocuments({
      isActive: true,
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

// GET CATEGORY BY ID - PUBLIC
const getCategoryById = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({
    _id: req.params.categoryId,

    isActive: true,
  });

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  res.status(200).json({
    status: "success",

    data: {
      category,
    },
  });
});

// GET CATEGORY BY SLUG - PUBLIC
const getCategoryBySlug = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({
    slug: req.params.slug,

    isActive: true,
  });

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  res.status(200).json({
    status: "success",

    data: {
      category,
    },
  });
});

// CREATE CATEGORY
const addCategory = catchAsync(async (req, res) => {
  const categoryData = {
    name: req.body.name,

    isActive: req.body.isActive,

    sortOrder: req.body.sortOrder,
  };

  if (req.body.slug) {
    categoryData.slug = createSlug(req.body.slug);
  }

  const category = await Category.create(categoryData);

  res.status(201).json({
    status: "success",

    data: {
      category,
    },
  });
});

// EDIT CATEGORY DATA
const editCategoryById = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  const allowedFields = ["name", "isActive", "sortOrder"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  }

  if (req.body.slug) {
    category.slug = createSlug(req.body.slug);
  }

  await category.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",

    data: {
      category,
    },
  });
});

// UPDATE CATEGORY ICON
const updateCategoryIcon = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError(400, "category icon is required"));
  }

  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  const oldIcon = category.icon;

  const fileName = `category-${category._id}-${Date.now()}.webp`;

  await fs.mkdir(CATEGORY_IMAGES_DIRECTORY, {
    recursive: true,
  });

  const filePath = path.join(CATEGORY_IMAGES_DIRECTORY, fileName);

  await sharp(req.file.buffer)
    .resize(400, 400, {
      fit: "cover",
    })
    .webp({
      quality: 85,
    })
    .toFile(filePath);

  category.icon = `/images/models-images/product-images/category-images/${fileName}`;

  try {
    await category.save({
      validateModifiedOnly: true,
    });
  } catch (err) {
    await fs.unlink(filePath).catch(() => {});

    throw err;
  }

  // فقط عکس custom قبلی پاک می‌شود.
  // عکس default هیچ‌وقت حذف نمی‌شود.
  if (oldIcon && oldIcon !== DEFAULT_CATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(200).json({
    status: "success",

    data: {
      category,
    },
  });
});

// RESET CATEGORY ICON TO DEFAULT
const deleteCategoryIcon = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  const oldIcon = category.icon;

  category.icon = DEFAULT_CATEGORY_ICON;

  await category.save({
    validateModifiedOnly: true,
  });

  // اگر قبلاً custom icon داشته،
  // فایلش رو پاک می‌کنیم.
  // default هرگز پاک نمی‌شود.
  if (oldIcon && oldIcon !== DEFAULT_CATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(200).json({
    status: "success",

    message: "category icon has been reset to default",

    data: {
      category,
    },
  });
});

// DELETE CATEGORY
const deleteCategoryById = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  const oldIcon = category.icon;

  await Category.findByIdAndDelete(category._id);

  // اگر category آیکون custom داشته،
  // بعد از حذف category فایلش هم پاک می‌شود.
  if (oldIcon && oldIcon !== DEFAULT_CATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(204).send();
});

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  addCategory,
  editCategoryById,
  updateCategoryIcon,
  deleteCategoryIcon,
  deleteCategoryById,
};
