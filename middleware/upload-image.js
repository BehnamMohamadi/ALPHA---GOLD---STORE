const multer = require("multer");

const { AppError } = require("../utils/app-error");

const storage = multer.memoryStorage();

const imageFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    return callback(new AppError(400, "uploaded file must be an image"), false);
  }

  callback(null, true);
};

const uploadImage = multer({
  storage,

  fileFilter: imageFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadImage,
};
