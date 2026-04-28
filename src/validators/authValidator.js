const { body } = require('express-validator');

/**
 * Validation rules for send-otp endpoint (phone-based).
 */
const validateSendOtp = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+91\d{10}$/)
    .withMessage('Invalid phone number. Use +91XXXXXXXXXX format'),
];

/**
 * Validation rules for verify-otp endpoint (phone-based).
 */
const validateVerifyOtp = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+91\d{10}$/)
    .withMessage('Invalid phone number. Use +91XXXXXXXXXX format'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('role')
    .optional()
    .isIn(['farmer', 'customer'])
    .withMessage('Role must be either farmer or customer'),
];

/**
 * Validation rules for signup endpoint (email-based).
 */
const validateSignup = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['farmer', 'customer'])
    .withMessage('Role must be either farmer or customer'),
  body('farmName')
    .if(body('role').equals('farmer'))
    .notEmpty()
    .withMessage('Farm name is required for farmer registration')
    .isLength({ min: 2, max: 100 })
    .withMessage('Farm name must be between 2 and 100 characters')
    .trim(),
];

/**
 * Validation rules for email login endpoint.
 */
const validateLoginEmail = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

/**
 * Validation rules for verify-email-otp endpoint.
 */
const validateVerifyEmailOtp = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

module.exports = {
  validateSendOtp,
  validateVerifyOtp,
  validateSignup,
  validateLoginEmail,
  validateVerifyEmailOtp,
};
