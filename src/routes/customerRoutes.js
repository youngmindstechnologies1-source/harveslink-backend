const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireCustomer } = require('../middleware/roleGuard');
const {
  createOrUpdateProfile,
  getProfile,
  getNearbyFarms,
  browseProducts,
  createOrder,
  getOrders,
  getOrderById,
} = require('../controllers/customerController');
const {
  validateCustomerProfile,
  validateNearbySearch,
  validateCreateOrder,
} = require('../validators/customerValidator');

// All routes require authentication + customer role
router.use(authenticate, requireCustomer);

// Profile
router.post('/profile', validateCustomerProfile, createOrUpdateProfile);
router.get('/profile', getProfile);

// Discovery
router.get('/farms/nearby', validateNearbySearch, getNearbyFarms);
router.get('/products', browseProducts);

// Orders
router.post('/orders', validateCreateOrder, createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

module.exports = router;
