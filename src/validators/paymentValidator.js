const { body } = require('express-validator');

/**
 * Validation rules for Razorpay payment verification.
 */
const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
];

/**
 * Validation rules for creating a payment order.
 */
const validateCreatePaymentOrder = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

module.exports = { validatePaymentVerification, validateCreatePaymentOrder };
