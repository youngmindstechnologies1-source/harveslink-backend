const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireCustomer } = require('../middleware/roleGuard');
const {
  createReview,
  getFarmerReviews,
  validateCreateReview,
} = require('../controllers/reviewController');

// Create review (customer only)
router.post('/', authenticate, requireCustomer, validateCreateReview, createReview);

// Get farmer reviews (public)
router.get('/farmer/:farmerId', getFarmerReviews);

module.exports = router;
