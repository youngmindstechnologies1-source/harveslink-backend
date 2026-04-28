const { validationResult } = require('express-validator');
const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { uploadToCloudinary } = require('../config/cloudinary');
const { verifyFreshness, suggestMandiPrice } = require('../utils/claudeAI');
const { fetchMandiPrice } = require('../utils/mandiPrices');
const { notifyOrderShipped } = require('../utils/notifications');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');

/**
 * POST /api/farmer/profile
 * Create or update farmer profile.
 */
async function createOrUpdateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const userId = req.user.id;
    const { farmName, bio, location, bankDetails } = req.body;

    // Handle cover photo upload
    let coverPhoto;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'harvestlink/farms');
      coverPhoto = result.secure_url;
    }

    const updateData = {
      userId,
      farmName,
      bio,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
      },
    };

    if (coverPhoto) updateData.coverPhoto = coverPhoto;
    if (bankDetails) updateData.bankDetails = bankDetails;

    const farmer = await Farmer.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Farmer profile saved successfully',
      farmer: {
        id: farmer._id,
        farmName: farmer.farmName,
        bio: farmer.bio,
        coverPhoto: farmer.coverPhoto,
        location: {
          coordinates: farmer.location.coordinates,
          address: farmer.location.address,
        },
        rating: farmer.rating,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/farmer/profile
 * Get farmer profile.
 */
async function getProfile(req, res, next) {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.id });

    if (!farmer) {
      return next(new AppError('Farmer profile not found. Please create your profile first.', 404));
    }

    res.status(200).json({
      farmer: {
        id: farmer._id,
        farmName: farmer.farmName,
        bio: farmer.bio,
        coverPhoto: farmer.coverPhoto,
        location: {
          coordinates: farmer.location.coordinates,
          address: farmer.location.address,
        },
        rating: farmer.rating,
        createdAt: farmer.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/farmer/products
 * Create a product with image upload, AI verification, and mandi price suggestion.
 */
async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    // Find farmer profile
    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found. Please create your profile first.', 404));
    }

    const { name, category, price, unit, quantity, harvestDate } = req.body;

    // Upload image to Cloudinary
    let photoUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'harvestlink/products');
      photoUrl = result.secure_url;
    }

    // Create product
    const product = await Product.create({
      farmerId: farmer._id,
      name,
      category,
      price: parseFloat(price),
      unit,
      quantity: parseFloat(quantity),
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      photo: photoUrl,
    });

    // Trigger AI freshness verification asynchronously (don't block response)
    if (photoUrl) {
      verifyFreshness(photoUrl)
        .then(async (result) => {
          product.aiVerificationResult = result;
          product.aiVerified = result.confidence > 70;
          await product.save();
          console.log(`🤖 AI verification for product ${product._id}: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.error(`❌ AI verification failed for product ${product._id}:`, err.message);
        });
    }

    // Fetch mandi price suggestion asynchronously
    fetchMandiPrice(name, farmer.location?.address?.split(',').pop()?.trim() || 'Maharashtra')
      .then(async (mandiData) => {
        if (mandiData) {
          const suggestedPrice = await suggestMandiPrice(name, category, mandiData);
          if (suggestedPrice) {
            product.mandiSuggestedPrice = suggestedPrice;
            await product.save();
            console.log(`📊 Mandi suggested price for ${name}: ₹${suggestedPrice}`);
          }
        }
      })
      .catch((err) => {
        console.error(`❌ Mandi price fetch failed for ${name}:`, err.message);
      });

    res.status(201).json({
      message: 'Product created successfully. AI verification is in progress.',
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        quantity: product.quantity,
        harvestDate: product.harvestDate,
        photo: product.photo,
        aiVerified: product.aiVerified,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/farmer/inventory
 * Get all products for the logged-in farmer.
 */
async function getInventory(req, res, next) {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found.', 404));
    }

    const { page = 1, limit = 20, category, active } = req.query;

    const filter = { farmerId: farmer._id };
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
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
 * PATCH /api/farmer/products/:id
 * Update a product.
 */
async function updateProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found.', 404));
    }

    const product = await Product.findOne({
      _id: req.params.id,
      farmerId: farmer._id,
    });

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    const allowedUpdates = ['name', 'category', 'price', 'unit', 'quantity', 'harvestDate'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle image update
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'harvestlink/products');
      updates.photo = result.secure_url;

      // Re-run AI verification
      verifyFreshness(result.secure_url)
        .then(async (aiResult) => {
          await Product.findByIdAndUpdate(product._id, {
            aiVerificationResult: aiResult,
            aiVerified: aiResult.confidence > 70,
          });
        })
        .catch((err) => console.error('AI re-verification failed:', err.message));
    }

    const updatedProduct = await Product.findByIdAndUpdate(product._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/farmer/products/:id
 * Soft-delete a product (set isActive to false).
 */
async function deleteProduct(req, res, next) {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found.', 404));
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, farmerId: farmer._id },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    res.status(200).json({ message: 'Product deactivated successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/farmer/orders
 * Get all orders for the logged-in farmer.
 */
async function getOrders(req, res, next) {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found.', 404));
    }

    const { page = 1, limit = 20, status } = req.query;

    const filter = { farmerId: farmer._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      orders,
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
 * PATCH /api/farmer/orders/:id/status
 * Update order status.
 * Valid transitions: pending -> confirmed, confirmed -> out-for-delivery, 
 * out-for-delivery -> delivered (requires delivery OTP), any -> cancelled
 */
async function updateOrderStatus(req, res, next) {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.id });
    if (!farmer) {
      return next(new AppError('Farmer profile not found.', 404));
    }

    const order = await Order.findOne({
      _id: req.params.id,
      farmerId: farmer._id,
    });

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    const { status, deliveryOtp } = req.body;

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['out-for-delivery', 'cancelled'],
      'out-for-delivery': ['delivered', 'cancelled'],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(status)) {
      return next(
        new AppError(`Cannot transition from '${order.status}' to '${status}'.`, 400)
      );
    }

    // For delivery, verify the delivery OTP
    if (status === 'delivered') {
      if (!deliveryOtp) {
        return next(new AppError('Delivery OTP is required to mark as delivered.', 400));
      }

      const { hashSHA256 } = require('../utils/crypto');
      const hashedOtp = hashSHA256(deliveryOtp);

      if (hashedOtp !== order.deliveryOTP) {
        return next(new AppError('Invalid delivery OTP.', 400));
      }
    }

    order.status = status;
    await order.save();

    // Send notification for status changes
    if (status === 'out-for-delivery') {
      const customer = await Customer.findById(order.customerId);
      if (customer) {
        notifyOrderShipped(customer, order).catch((err) =>
          console.error('Notification failed:', err.message)
        );
      }
    }

    res.status(200).json({
      message: `Order status updated to '${status}'`,
      order: {
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrUpdateProfile,
  getProfile,
  createProduct,
  getInventory,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
};
