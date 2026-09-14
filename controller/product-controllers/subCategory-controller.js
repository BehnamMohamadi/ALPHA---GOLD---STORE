const path = require("node:path");
const fs = require("node:fs/promises");

const sharp = require("sharp");

const SubCategory = require("../../models/product-models/subCategory-model");

const Category = require("../../models/product-models/category-model");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const { ApiFeatures } = require("../../utils/api-features");

const { createSlug } = require("../../utils/slugify");

const DEFAULT_SUBCATEGORY_ICON =
  "/images/models-images/product-images/subCategory-images/sub-category-image-default.webp";

const SUBCATEGORY_IMAGES_DIRECTORY = path.join(
  __dirname,
  "../../public/images/models-images/product-images/subCategory-images",
);

const getAllSubCategories = catchAsync(async (req, res) => {
  const features = new ApiFeatures(
    SubCategory.find({
      isActive: true,
    }),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [subCategories, total] = await Promise.all([
    features.query.populate("category", "name slug"),

    SubCategory.countDocuments({
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

    results: subCategories.length,

    data: {
      subCategories,
    },
  });
});

const getSubCategoryById = catchAsync(async (req, res, next) => {
  const subCategory = await SubCategory.findOne({
    _id: req.params.subCategoryId,

    isActive: true,
  }).populate("category", "name slug");

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  res.status(200).json({
    status: "success",

    data: {
      subCategory,
    },
  });
});

const getSubCategoryBySlugs = catchAsync(async (req, res, next) => {
  const { categorySlug, subCategorySlug } = req.params;

  const category = await Category.findOne({
    slug: categorySlug,
    isActive: true,
  });

  if (!category) {
    return next(new AppError(404, "category not found"));
  }

  const subCategory = await SubCategory.findOne({
    slug: subCategorySlug,
    category: category._id,
    isActive: true,
  }).populate("category", "name slug");

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  res.status(200).json({
    status: "success",

    data: {
      subCategory,
    },
  });
});

const addSubCategory = catchAsync(async (req, res, next) => {
  const categoryExists = await Category.exists({
    _id: req.body.category,
    isActive: true,
  });

  if (!categoryExists) {
    return next(new AppError(400, "selected category does not exist"));
  }

  const subCategoryData = {
    name: req.body.name,
    category: req.body.category,
    isActive: req.body.isActive,
    sortOrder: req.body.sortOrder,
  };

  if (req.body.slug) {
    subCategoryData.slug = createSlug(req.body.slug);
  }

  const subCategory = await SubCategory.create(subCategoryData);

  res.status(201).json({
    status: "success",

    data: {
      subCategory,
    },
  });
});

const editSubCategoryById = catchAsync(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.subCategoryId);

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  if (req.body.category !== undefined) {
    const categoryExists = await Category.exists({
      _id: req.body.category,
      isActive: true,
    });

    if (!categoryExists) {
      return next(new AppError(400, "selected category does not exist"));
    }

    subCategory.category = req.body.category;
  }

  const allowedFields = ["name", "isActive", "sortOrder"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      subCategory[field] = req.body[field];
    }
  }

  if (req.body.slug) {
    subCategory.slug = createSlug(req.body.slug);
  }

  await subCategory.save({
    validateModifiedOnly: true,
  });

  res.status(200).json({
    status: "success",

    data: {
      subCategory,
    },
  });
});

const updateSubCategoryIcon = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError(400, "subcategory icon is required"));
  }

  const subCategory = await SubCategory.findById(req.params.subCategoryId);

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  const oldIcon = subCategory.icon;

  const fileName = `subcategory-${subCategory._id}-${Date.now()}.webp`;

  await fs.mkdir(SUBCATEGORY_IMAGES_DIRECTORY, {
    recursive: true,
  });

  const filePath = path.join(SUBCATEGORY_IMAGES_DIRECTORY, fileName);

  await sharp(req.file.buffer)
    .resize(400, 400, {
      fit: "cover",
    })
    .webp({
      quality: 85,
    })
    .toFile(filePath);

  subCategory.icon = `/images/models-images/product-images/subCategory-images/${fileName}`;

  try {
    await subCategory.save({
      validateModifiedOnly: true,
    });
  } catch (err) {
    await fs.unlink(filePath).catch(() => {});

    throw err;
  }

  if (oldIcon && oldIcon !== DEFAULT_SUBCATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(200).json({
    status: "success",

    data: {
      subCategory,
    },
  });
});

const deleteSubCategoryIcon = catchAsync(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.subCategoryId);

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  const oldIcon = subCategory.icon;

  subCategory.icon = DEFAULT_SUBCATEGORY_ICON;

  await subCategory.save({
    validateModifiedOnly: true,
  });

  if (oldIcon && oldIcon !== DEFAULT_SUBCATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(200).json({
    status: "success",

    message: "subcategory icon has been reset to default",

    data: {
      subCategory,
    },
  });
});

const deleteSubCategoryById = catchAsync(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.subCategoryId);

  if (!subCategory) {
    return next(new AppError(404, "subcategory not found"));
  }

  const oldIcon = subCategory.icon;

  await SubCategory.findByIdAndDelete(subCategory._id);

  if (oldIcon && oldIcon !== DEFAULT_SUBCATEGORY_ICON) {
    const oldIconPath = path.join(__dirname, "../../public", oldIcon);

    await fs.unlink(oldIconPath).catch(() => {});
  }

  res.status(204).send();
});

module.exports = {
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoryBySlugs,
  addSubCategory,
  editSubCategoryById,
  updateSubCategoryIcon,
  deleteSubCategoryIcon,
  deleteSubCategoryById,
};
