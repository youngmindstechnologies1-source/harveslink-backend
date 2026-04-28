const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');

/**
 * POST /api/reviews
 * Create a review for a delivered order.
 */
async function createReview(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return next(new AppError('Customer profile not found.', 404));
    }

    const { orderId, rating, comment } = req.body;

    // Verify order exists and belongs to customer
    const order = await Order.findOne({
      _id: orderId,
      customerId: customer._id,
    });

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    if (order.status !== 'delivered') {
      return next(new AppError('You can only review delivered orders.', 400));
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return next(new AppError('You have already reviewed this order.', 409));
    }

    const review = await Review.create({
      orderId,
      customerId: customer._id,
      farmerId: order.farmerId,
      rating,
      comment,
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/farmer/:farmerId
 * Get reviews for a farmer.
 */
async function getFarmerReviews(req, res, next) {
  try {
    const { farmerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ farmerId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ farmerId });

    res.status(200).json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validation rules for creating a review.
 */
const validateCreateReview = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
    .trim(),
];

module.exports = { createReview, getFarmerReviews, validateCreateReview };
