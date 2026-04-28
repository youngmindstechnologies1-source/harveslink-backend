const { body, query } = require('express-validator');

/**
 * Validation rules for customer profile creation/update.
 */
const validateCustomerProfile = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters')
    .trim(),
  body('addresses')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Cannot have more than 10 addresses'),
  body('addresses.*.label')
    .optional()
    .notEmpty()
    .withMessage('Address label is required')
    .isLength({ max: 50 })
    .withMessage('Label cannot exceed 50 characters'),
  body('addresses.*.location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  body('addresses.*.fullAddress')
    .optional()
    .notEmpty()
    .withMessage('Full address is required'),
  body('defaultAddressIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Default address index must be a non-negative integer'),
];

/**
 * Validation rules for nearby farms search.
 */
const validateNearbySearch = [
  query('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
];

/**
 * Validation rules for order creation.
 */
const validateCreateOrder = [
  body('farmerId')
    .notEmpty()
    .withMessage('Farmer ID is required')
    .isMongoId()
    .withMessage('Invalid farmer ID'),
  body('items')
    .notEmpty()
    .withMessage('Order items are required')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('deliveryAddressIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Delivery address index must be a non-negative integer'),
];

module.exports = { validateCustomerProfile, validateNearbySearch, validateCreateOrder };
