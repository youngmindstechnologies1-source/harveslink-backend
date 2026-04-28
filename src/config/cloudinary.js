const cloudinary = require('cloudinary').v2;
const { env } = require('./env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The Cloudinary folder to upload to
 * @returns {Promise<Object>} Cloudinary upload result
 */
function uploadToCloudinary(fileBuffer, folder = 'harvestlink') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

module.exports = { cloudinary, uploadToCloudinary };
