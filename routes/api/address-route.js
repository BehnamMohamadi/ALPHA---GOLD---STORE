const express = require("express");

const {
  getMyAddresses,
  getMyAddress,
  addAddress,
  editAddress,
  setDefaultAddress,
  deleteAddress,
  getUserAddressesForAdmin,
} = require("../../controller/address-controller");

const {
  protect,
  restrictTo,
} = require("../../middleware/auth-middleware");

const { validate } = require("../../middleware/validate");
const { validateParam } = require("../../middleware/validate-param");

const {
  addressIdSchema,
  createAddressSchema,
  editAddressSchema,
} = require("../../validation/address-validation");

const {
  objectIdSchema,
} = require("../../validation/user-validation");

const router = express.Router();

router.use(protect);

router.get(
  "/admin/user/:userId",
  restrictTo("admin"),
  validateParam("userId", objectIdSchema),
  getUserAddressesForAdmin,
);

router
  .route("/")
  .get(getMyAddresses)
  .post(
    validate(createAddressSchema),
    addAddress,
  );

router.patch(
  "/:addressId/default",
  validateParam("addressId", addressIdSchema),
  setDefaultAddress,
);

router
  .route("/:addressId")
  .get(
    validateParam("addressId", addressIdSchema),
    getMyAddress,
  )
  .patch(
    validateParam("addressId", addressIdSchema),
    validate(editAddressSchema),
    editAddress,
  )
  .delete(
    validateParam("addressId", addressIdSchema),
    deleteAddress,
  );

module.exports = router;
