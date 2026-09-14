const express = require("express");

const {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  addCategory,
  editCategoryById,
  updateCategoryIcon,
  deleteCategoryIcon,
  deleteCategoryById,
} = require("../../../controller/product-controllers/category-controller");

const {
  getAllCategoriesForAdmin,
} = require("../../../controller/product-controllers/admin-catalog-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");
const { validateParam } = require("../../../middleware/validate-param");
const { uploadImage } = require("../../../middleware/upload-image");

const {
  categoryIdSchema,
  createCategorySchema,
  editCategorySchema,
} = require("../../../validation/product-validations/category-validation");

const router = express.Router();

// ADMIN READ
router.get(
  "/all",
  protect,
  restrictTo("admin"),
  getAllCategoriesForAdmin,
);

// PUBLIC
router.get("/", getAllCategories);

router.get(
  "/id/:categoryId",
  validateParam("categoryId", categoryIdSchema),
  getCategoryById,
);

router.get("/slug/:slug", getCategoryBySlug);

// ADMIN WRITE
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate(createCategorySchema),
  addCategory,
);

router.patch(
  "/edit-icon/:categoryId",
  protect,
  restrictTo("admin"),
  validateParam("categoryId", categoryIdSchema),
  uploadImage.single("icon"),
  updateCategoryIcon,
);

router.delete(
  "/delete-icon/:categoryId",
  protect,
  restrictTo("admin"),
  validateParam("categoryId", categoryIdSchema),
  deleteCategoryIcon,
);

router.patch(
  "/:categoryId",
  protect,
  restrictTo("admin"),
  validateParam("categoryId", categoryIdSchema),
  validate(editCategorySchema),
  editCategoryById,
);

router.delete(
  "/:categoryId",
  protect,
  restrictTo("admin"),
  validateParam("categoryId", categoryIdSchema),
  deleteCategoryById,
);

module.exports = router;
