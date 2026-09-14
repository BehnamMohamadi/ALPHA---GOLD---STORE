const express = require("express");

const {
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
} = require("../../../controller/product-controllers/product-controller");

const {
  getAllProductsForAdmin,
  getProductByIdForAdmin,
} = require("../../../controller/product-controllers/admin-catalog-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");
const { validateParam } = require("../../../middleware/validate-param");

const { uploadImage } = require("../../../middleware/upload-image");

const {
  productIdSchema,
  createProductSchema,
  editProductSchema,
} = require("../../../validation/product-validations/product-validation");

const router = express.Router();

// =========================
// ADMIN READ ROUTES
// Must stay before dynamic public/admin routes.
// =========================

router.get("/all", protect, restrictTo("admin"), getAllProductsForAdmin);

router.get(
  "/admin/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  getProductByIdForAdmin,
);

// =========================
// PUBLIC ROUTES
// =========================

router.get("/", getAllProducts);

router.get("/id/:productId", validateParam("productId", productIdSchema), getProductById);

router.get("/slug/:slug", getProductBySlug);

// =========================
// ADMIN WRITE ROUTES
// =========================

router.post("/", protect, restrictTo("admin"), validate(createProductSchema), addProduct);

// Cover Image
router.patch(
  "/edit-cover/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  uploadImage.single("coverImage"),
  updateProductCover,
);

router.delete(
  "/delete-cover/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  deleteProductCover,
);

// Gallery Upload
router.post(
  "/images/upload/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  uploadImage.array("images", 10),
  uploadProductImages,
);

// Replace Gallery State
router.put(
  "/images/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  uploadImage.array("images", 10),
  replaceProductImages,
);

// Product CRUD
router.patch(
  "/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  validate(editProductSchema),
  editProductById,
);

router.delete(
  "/:productId",
  protect,
  restrictTo("admin"),
  validateParam("productId", productIdSchema),
  deleteProductById,
);

module.exports = router;
