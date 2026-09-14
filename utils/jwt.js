const jwt = require("jsonwebtoken");

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, version: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

module.exports = { signAccessToken, verifyAccessToken };
