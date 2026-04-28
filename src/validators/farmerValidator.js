const { body } = require('express-validator');

/**
 * Validation rules for farmer profile creation/update.
 */
const validateFarmerProfile = [
  body('farmName')
    .notEmpty()
    .withMessage('Farm name is required')
    .isLength({ max: 100 })
    .withMessage('Farm name cannot exceed 100 characters')
    .trim(),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .trim(),
  body('location.coordinates')
    .notEmpty()
    .withMessage('Location coordinates are required')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('location.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('location.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location.address')
    .notEmpty()
    .withMessage('Farm address is required')
    .trim(),
  body('bankDetails.accountNumber')
    .optional()
    .isLength({ min: 8, max: 18 })
    .withMessage('Account number must be 8-18 characters'),
  body('bankDetails.ifsc')
    .optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code format'),
  body('bankDetails.accountHolder')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Account holder name cannot exceed 100 characters')
    .trim(),
];

/**
 * Validation rules for product creation.
 */
const validateProduct = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters')
    .trim(),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'other'])
    .withMessage('Invalid product category'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['kg', 'gram', 'litre', 'piece', 'dozen', 'bunch'])
    .withMessage('Invalid unit'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('harvestDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid harvest date format'),
];

/**
 * Validation rules for product update.
 */
const validateProductUpdate = [
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters')
    .trim(),
  body('category')
    .optional()
    .isIn(['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'other'])
    .withMessage('Invalid product category'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('unit')
    .optional()
    .isIn(['kg', 'gram', 'litre', 'piece', 'dozen', 'bunch'])
    .withMessage('Invalid unit'),
  body('quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('harvestDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid harvest date format'),
];

module.exports = { validateFarmerProfile, validateProduct, validateProductUpdate };
