const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');
const { validateCreatePaymentOrder, validatePaymentVerification } = require('../validators/paymentValidator');

// Create payment order (requires auth)
router.post('/create-order', authenticate, validateCreatePaymentOrder, createPaymentOrder);

// Verify payment (can be called from webhook or client)
router.post('/verify', validatePaymentVerification, verifyPayment);

module.exports = router;
