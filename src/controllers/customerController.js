const { validationResult } = require('express-validator');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { hashSHA256 } = require('../utils/crypto');
const { notifyNewOrder } = require('../utils/notifications');
const AppError = require('../utils/AppError');

/**
 * POST /api/customer/profile
 * Create or update customer profile.
 */
async function createOrUpdateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const userId = req.user.id;
    const { name, addresses, defaultAddressIndex } = req.body;

    const updateData = { userId, name };
    if (addresses) {
      updateData.addresses = addresses.map((addr) => ({
        label: addr.label,
        location: {
          type: 'Point',
          coordinates: addr.location?.coordinates || [addr.lng, addr.lat],
        },
        fullAddress: addr.fullAddress,
      }));
    }
    if (defaultAddressIndex !== undefined) {
      updateData.defaultAddressIndex = defaultAddressIndex;
    }

    const customer = await Customer.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Customer profile saved successfully',
      customer: {
        id: customer._id,
        name: customer.name,
        addresses: customer.addresses,
        defaultAddressIndex: customer.defaultAddressIndex,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customer/profile
 * Get customer profile.
 */
async function getProfile(req, res, next) {
  try {
    const customer = await Customer.findOne({ userId: req.user.id });

    if (!customer) {
      return next(new AppError('Customer profile not found. Please create your profile first.', 404));
    }

    res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        addresses: customer.addresses,
        defaultAddressIndex: customer.defaultAddressIndex,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customer/farms/nearby
 * Find nearby farms using MongoDB $near with 2dsphere index.
 * Query params: lat, lng, radius (in km, default 10)
 */
async function getNearbyFarms(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { lat, lng, radius = 10 } = req.query;
    const radiusInMeters = parseFloat(radius) * 1000;

    const farms = await Farmer.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radiusInMeters,
        },
      },
    }).select('farmName bio coverPhoto location rating');

    res.status(200).json({
      farms,
      count: farms.length,
      searchRadius: `${radius} km`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customer/products
 * Browse products with filters.
 * Query params: farmerId, category, search, minPrice, maxPrice, page, limit
 */
async function browseProducts(req, res, next) {
  try {
    const {
      farmerId,
      category,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isActive: true };

    if (farmerId) filter.farmerId = farmerId;
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const products = await Product.find(filter)
      .populate('farmerId', 'farmName location rating')
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
 * POST /api/customer/orders
 * Create an order and generate delivery OTP.
 */
async function createOrder(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return next(new AppError('Customer profile not found. Please create your profile first.', 404));
    }

    const { farmerId, items, deliveryAddressIndex } = req.body;

    // Verify farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return next(new AppError('Farmer not found.', 404));
    }

    // Fetch and validate products, calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        farmerId,
        isActive: true,
      });

      if (!product) {
        return next(new AppError(`Product ${item.productId} not found or unavailable.`, 404));
      }

      if (product.quantity < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.quantity} ${product.unit}`,
            400
          )
        );
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
      });

      // Reduce stock
      product.quantity -= item.quantity;
      await product.save();
    }

    // Get delivery address
    const addrIndex = deliveryAddressIndex !== undefined
      ? deliveryAddressIndex
      : customer.defaultAddressIndex;
    const deliveryAddr = customer.addresses[addrIndex];

    if (!deliveryAddr) {
      return next(new AppError('No delivery address found. Please add an address first.', 400));
    }

    // Generate delivery OTP
    const rawDeliveryOtp = crypto.randomInt(100000, 999999).toString();
    const hashedDeliveryOtp = hashSHA256(rawDeliveryOtp);

    // Create order
    const order = await Order.create({
      customerId: customer._id,
      farmerId: farmer._id,
      items: orderItems,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      deliveryOTP: hashedDeliveryOtp,
      deliveryAddress: {
        label: deliveryAddr.label,
        fullAddress: deliveryAddr.fullAddress,
        coordinates: deliveryAddr.location.coordinates,
      },
    });

    // Notify farmer
    notifyNewOrder(farmer, order).catch((err) =>
      console.error('Failed to notify farmer:', err.message)
    );

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryOTP: rawDeliveryOtp, // Send plain OTP to customer (they share with delivery)
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customer/orders
 * Get customer's order history.
 */
async function getOrders(req, res, next) {
  try {
    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return next(new AppError('Customer profile not found.', 404));
    }

    const { page = 1, limit = 20, status } = req.query;

    const filter = { customerId: customer._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('farmerId', 'farmName')
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
 * GET /api/customer/orders/:id
 * Get order details and tracking status.
 */
async function getOrderById(req, res, next) {
  try {
    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return next(new AppError('Customer profile not found.', 404));
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: customer._id,
    })
      .populate('farmerId', 'farmName location coverPhoto')
      .populate('items.productId', 'photo');

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrUpdateProfile,
  getProfile,
  getNearbyFarms,
  browseProducts,
  createOrder,
  getOrders,
  getOrderById,
};
