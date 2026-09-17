const lifecycle = require('../../../controller/product-controllers/catalog-lifecycle-controller');
const express = require("express");

const {
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoryBySlugs,
  addSubCategory,
  editSubCategoryById,
  updateSubCategoryIcon,
  deleteSubCategoryIcon,
  deleteSubCategoryById,
} = require("../../../controller/product-controllers/subCategory-controller");

const {
  getAllSubCategoriesForAdmin,
} = require("../../../controller/product-controllers/admin-catalog-controller");

const { protect, restrictTo } = require("../../../middleware/auth-middleware");

const { validate } = require("../../../middleware/validate");
const { validateParam } = require("../../../middleware/validate-param");
const { uploadImage } = require("../../../middleware/upload-image");

const {
  subCategoryIdSchema,
  createSubCategorySchema,
  editSubCategorySchema,
} = require("../../../validation/product-validations/subCategory-validation");

const router = express.Router();

router.get('/:subCategoryId/dependencies', protect, restrictTo('admin'), validateParam('subCategoryId', subCategoryIdSchema), lifecycle.dependencies('subCategory'));

// ADMIN READ
router.get(
  "/all",
  protect,
  restrictTo("admin"),
  getAllSubCategoriesForAdmin,
);

// PUBLIC
router.get("/", getAllSubCategories);

router.get(
  "/id/:subCategoryId",
  validateParam("subCategoryId", subCategoryIdSchema),
  getSubCategoryById,
);

router.get(
  "/category/:categorySlug/subCategory/:subCategorySlug",
  getSubCategoryBySlugs,
);

// ADMIN WRITE
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate(createSubCategorySchema),
  addSubCategory,
);

router.patch(
  "/edit-icon/:subCategoryId",
  protect,
  restrictTo("admin"),
  validateParam("subCategoryId", subCategoryIdSchema),
  uploadImage.single("icon"),
  updateSubCategoryIcon,
);

router.delete(
  "/delete-icon/:subCategoryId",
  protect,
  restrictTo("admin"),
  validateParam("subCategoryId", subCategoryIdSchema),
  deleteSubCategoryIcon,
);

router.patch(
  "/:subCategoryId",
  protect,
  restrictTo("admin"),
  validateParam("subCategoryId", subCategoryIdSchema),
  validate(editSubCategorySchema),
  lifecycle.deactivate('subCategory'),
  editSubCategoryById,
);

router.delete(
  "/:subCategoryId",
  protect,
  restrictTo("admin"),
  validateParam("subCategoryId", subCategoryIdSchema),
  lifecycle.preventDelete,
);

module.exports = router;
