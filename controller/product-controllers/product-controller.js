const path = require("path");
const fs = require("fs/promises");

const sharp = require("sharp");

const Product = require("../../models/product-models/product-model");

const Category = require("../../models/product-models/category-model");

const SubCategory = require("../../models/product-models/subCategory-model");

const { ApiFeatures } = require("../../utils/api-features");

const { createSlug } = require("../../utils/slugify");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const PRODUCT_IMAGES_DIRECTORY = path.join(
  __dirname,
  "../../public/images/models-images/product-images/product-images",
);

const DEFAULT_COVER_IMAGE =
  "/images/models-images/product-images/product-images/product-cover-image-default.webp";

const DEFAULT_GALLERY_IMAGE =
  "/images/models-images/product-images/product-images/product-image-default.webp";

const getImageFilePath = (imagePath) => {
  return path.join(__dirname, "../../public", imagePath.replace(/^\/+/, ""));
};

const deleteFileIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
};

const validateCategoryAndSubCategory = async (categoryId, subCategoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError(400, "selected category does not exist");
  }

  const subCategory = await SubCategory.findOne({
    _id: subCategoryId,
    category: categoryId,
  });

  if (!subCategory) {
    throw new AppError(400, "selected subcategory does not belong to selected category");
  }
};

const getAllProducts = catchAsync(async (req, res) => {
  const result = await require("../../services/catalog-service").catalog(req.query);
  return res.json({ status: "success", results: result.products.length, pagination: result.pagination, data: { products: result.products } });
  const baseFilter = {
    isActive: true,
  };

  const features = new ApiFeatures(Product.find(baseFilter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query
    .populate("category", "name slug icon")
    .populate("subCategory", "name slug icon");

  const total = await Product.countDocuments({
    ...baseFilter,
    ...features.filterObject,
  });

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

const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({
    _id: req.params.productId,

    isActive: true,
  })
    .populate("category", "name slug icon")
    .populate("subCategory", "name slug icon");

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

const getProductBySlug = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({
    slug: req.params.slug,

    isActive: true,
  })
    .populate("category", "name slug icon")
    .populate("subCategory", "name slug icon");

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

const addProduct = catchAsync(async (req, res) => {
  await validateCategoryAndSubCategory(req.body.category, req.body.subCategory);

  const productData = {
    ...req.body,
  };

  if (productData.slug) {
    productData.slug = createSlug(productData.slug);
  }

  const product = await Product.create(productData);

  res.status(201).json({
    status: "success",

    data: {
      product,
    },
  });
});

const editProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  const categoryId = req.body.category || product.category.toString();

  const subCategoryId = req.body.subCategory || product.subCategory.toString();

  if (req.body.category || req.body.subCategory) {
    await validateCategoryAndSubCategory(categoryId, subCategoryId);
  }

  const allowedFields = [
    "name",
    "sku",
    "category",
    "subCategory",
    "gender",
    "goldWeight",
    "karat",
    "wage",
    "accessoriesPrice",
    "pricing",
    "details",
    "stock",
    "description",
    "isActive",
    "isFeatured",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  if (req.body.slug !== undefined) {
    product.slug = createSlug(req.body.slug);
  }

  await product.save();

  res.status(200).json({
    status: "success",

    data: {
      product,
    },
  });
});

const updateProductCover = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError(400, "product cover image is required"));
  }

  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  await fs.mkdir(PRODUCT_IMAGES_DIRECTORY, {
    recursive: true,
  });

  const fileName = `product-cover-${product._id}-${Date.now()}.webp`;

  const outputPath = path.join(PRODUCT_IMAGES_DIRECTORY, fileName);

  await sharp(req.file.buffer)
    .resize(1000, 1000, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,
    })
    .toFile(outputPath);

  const oldCover = product.coverImage;

  product.coverImage = `/images/models-images/product-images/product-images/${fileName}`;

  try {
    await product.save();
  } catch (err) {
    await deleteFileIfExists(outputPath);

    throw err;
  }

  if (oldCover && oldCover !== DEFAULT_COVER_IMAGE) {
    await deleteFileIfExists(getImageFilePath(oldCover));
  }

  res.status(200).json({
    status: "success",

    data: {
      product,
    },
  });
});

const deleteProductCover = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  const oldCover = product.coverImage;

  if (oldCover === DEFAULT_COVER_IMAGE) {
    return res.status(200).json({
      status: "success",

      data: {
        product,
      },
    });
  }

  product.coverImage = DEFAULT_COVER_IMAGE;

  await product.save();

  if (oldCover) {
    await deleteFileIfExists(getImageFilePath(oldCover));
  }

  res.status(200).json({
    status: "success",

    data: {
      product,
    },
  });
});

const uploadProductImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError(400, "at least one product image is required"));
  }

  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  await fs.mkdir(PRODUCT_IMAGES_DIRECTORY, {
    recursive: true,
  });

  const uploadedImages = [];

  const createdFiles = [];

  try {
    for (let index = 0; index < req.files.length; index += 1) {
      const fileName = `product-${product._id}-${Date.now()}-${index}.webp`;

      const outputPath = path.join(PRODUCT_IMAGES_DIRECTORY, fileName);

      await sharp(req.files[index].buffer)
        .resize(1000, 1000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 85,
        })
        .toFile(outputPath);

      createdFiles.push(outputPath);

      uploadedImages.push(
        `/images/models-images/product-images/product-images/${fileName}`,
      );
    }

    const currentImages = product.images.filter(
      (image) => image !== DEFAULT_GALLERY_IMAGE,
    );

    product.images = [...currentImages, ...uploadedImages];

    await product.save();
  } catch (err) {
    await Promise.all(createdFiles.map((file) => deleteFileIfExists(file)));

    throw err;
  }

  res.status(200).json({
    status: "success",

    data: {
      uploadedImages,

      images: product.images,
    },
  });
});

const replaceProductImages = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  await fs.mkdir(PRODUCT_IMAGES_DIRECTORY, {
    recursive: true,
  });

  const oldImages = product.images.filter((image) => image !== DEFAULT_GALLERY_IMAGE);

  const newImages = [];
  const createdFiles = [];

  try {
    if (req.files && req.files.length > 0) {
      for (let index = 0; index < req.files.length; index += 1) {
        const fileName = `product-${product._id}-${Date.now()}-${index}.webp`;

        const outputPath = path.join(PRODUCT_IMAGES_DIRECTORY, fileName);

        await sharp(req.files[index].buffer)
          .resize(1000, 1000, {
            fit: "inside",

            withoutEnlargement: true,
          })
          .webp({
            quality: 85,
          })
          .toFile(outputPath);

        createdFiles.push(outputPath);

        newImages.push(`/images/models-images/product-images/product-images/${fileName}`);
      }
    }

    product.images = newImages.length > 0 ? newImages : [DEFAULT_GALLERY_IMAGE];

    await product.save();
  } catch (err) {
    await Promise.all(createdFiles.map((file) => deleteFileIfExists(file)));

    throw err;
  }

  /*
   * DB successfully updated.
   * Now old physical files can be removed.
   */
  await Promise.all(
    oldImages.map((image) => deleteFileIfExists(getImageFilePath(image))),
  );

  res.status(200).json({
    status: "success",

    data: {
      images: product.images,
    },
  });
});

const deleteProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  if (await require('../../models/shopping-models/order-model').exists({ 'items.product': product._id })) return next(new AppError(409, 'این محصول سابقه سفارش دارد؛ برای حفظ سوابق، آن را غیرفعال کنید.'));
  const filesToDelete = [];

  if (product.coverImage && product.coverImage !== DEFAULT_COVER_IMAGE) {
    filesToDelete.push(getImageFilePath(product.coverImage));
  }

  product.images.forEach((image) => {
    if (image !== DEFAULT_GALLERY_IMAGE) {
      filesToDelete.push(getImageFilePath(image));
    }
  });

  await Product.deleteOne({
    _id: product._id,
  });

  await Promise.all(filesToDelete.map((file) => deleteFileIfExists(file)));

  res.status(204).send();
});

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,

  addProduct,
  editProductById,
  deleteProductById,

  updateProductCover,
  deleteProductCover,

  uploadProductImages,
  replaceProductImages,
};
