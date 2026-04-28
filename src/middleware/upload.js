const multer = require('multer');
const AppError = require('../utils/AppError');

// Use memory storage — buffer is sent directly to Cloudinary
const storage = multer.memoryStorage();

// File filter — accept only images
function fileFilter(req, file, cb) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400), false);
  }
}

/**
 * Multer upload middleware.
 * Configured for single image uploads with 5MB limit.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

module.exports = upload;
