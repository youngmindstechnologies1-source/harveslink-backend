const dotenv = require('dotenv');
dotenv.config();

const requiredVars = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
];

const optionalVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'MSG91_AUTH_KEY',
  'MSG91_TEMPLATE_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'ANTHROPIC_API_KEY',
  'FIREBASE_SERVICE_ACCOUNT_PATH',
  'AGMARKNET_API_KEY',
];

/**
 * Validates that all required environment variables are set.
 * Warns about missing optional variables in production.
 */
function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const missingOptional = optionalVars.filter((key) => !process.env[key]);
    if (missingOptional.length > 0) {
      console.warn('⚠️  Missing optional environment variables (needed for full functionality):');
      missingOptional.forEach((key) => console.warn(`   - ${key}`));
    }
  }

  console.log('✅ Environment variables validated');
}

module.exports = {
  validateEnv,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
    MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID,
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'HVSTLK',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_SECURE: process.env.SMTP_SECURE || 'false',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    AGMARKNET_API_KEY: process.env.AGMARKNET_API_KEY,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};
