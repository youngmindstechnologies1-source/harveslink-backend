const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireFarmer } = require('../middleware/roleGuard');
const upload = require('../middleware/upload');
const {
  createOrUpdateProfile,
  getProfile,
  createProduct,
  getInventory,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
} = require('../controllers/farmerController');
const {
  validateFarmerProfile,
  validateProduct,
  validateProductUpdate,
} = require('../validators/farmerValidator');

// All routes require authentication + farmer role
router.use(authenticate, requireFarmer);

// Profile
router.post('/profile', upload.single('coverPhoto'), validateFarmerProfile, createOrUpdateProfile);
router.get('/profile', getProfile);

// Products
router.post('/products', upload.single('photo'), validateProduct, createProduct);
router.get('/inventory', getInventory);
router.patch('/products/:id', upload.single('photo'), validateProductUpdate, updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
