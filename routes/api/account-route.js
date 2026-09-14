const express = require("express");
const {
  getUserAccount,
  editUserAccount,
  deleteUserAccount,
} = require("../../controller/account-controller");
const { protect } = require("../../middleware/auth-middleware");
const { validate } = require("../../middleware/validate");
const { editAccountSchema } = require("../../validation/account-validation");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getUserAccount)
  .patch(validate(editAccountSchema), editUserAccount)
  .delete(deleteUserAccount);

module.exports = router;
