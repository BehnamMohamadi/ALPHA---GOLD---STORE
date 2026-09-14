const express = require("express");

const apiRouter = require("./api/api-route");
const viewRouter = require("./view/view-route");

const router = express.Router();

router.use("/api", apiRouter);
router.use("/", require("./view/storefront-route"));
router.use("/", viewRouter);

module.exports = router;
