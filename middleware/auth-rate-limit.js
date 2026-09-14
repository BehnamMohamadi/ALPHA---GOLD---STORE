const rateLimit = require("express-rate-limit");

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "too many authentication attempts, please try again later",
  },
});

module.exports = { authRateLimit };
