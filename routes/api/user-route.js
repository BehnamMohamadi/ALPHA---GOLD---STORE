const express = require("express");
const {
  getAllUsers,
  getUserById,
  addUser,
  editUserById,
  deleteUserById,
} = require("../../controller/user-controller");
const { protect, restrictTo } = require("../../middleware/auth-middleware");
const { validate } = require("../../middleware/validate");
const { validateParam } = require("../../middleware/validate-param");
const {
  objectIdSchema,
  createUserSchema,
  editUserSchema,
} = require("../../validation/user-validation");

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.route("/").get(getAllUsers).post(validate(createUserSchema), addUser);

router
  .route("/:userId")
  .get(validateParam("userId", objectIdSchema), getUserById)
  .patch(validateParam("userId", objectIdSchema), validate(editUserSchema), editUserById)
  .delete(validateParam("userId", objectIdSchema), deleteUserById);

module.exports = router;
