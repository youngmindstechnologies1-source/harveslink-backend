const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const { getRazorpayInstance } = require('../config/razorpay');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for an existing order.
 */
async function createPaymentOrder(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    if (order.paymentStatus === 'paid') {
      return next(new AppError('Order is already paid.', 400));
    }

    // In development without Razorpay keys, return a mock order
    if (env.NODE_ENV === 'development' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
      const mockOrderId = `order_mock_${Date.now()}`;
      order.paymentDetails = { razorpayOrderId: mockOrderId };
      await order.save();

      return res.status(200).json({
        message: 'Mock payment order created (development mode)',
        razorpayOrder: {
          id: mockOrderId,
          amount: order.totalAmount * 100,
          currency: 'INR',
          status: 'created',
        },
        orderId: order._id,
      });
    }

    const razorpay = getRazorpayInstance();

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: order._id.toString(),
      notes: {
        orderId: order._id.toString(),
        customerId: order.customerId.toString(),
        farmerId: order.farmerId.toString(),
      },
    });

    // Store razorpay order ID
    order.paymentDetails = {
      razorpayOrderId: razorpayOrder.id,
    };
    await order.save();

    res.status(200).json({
      message: 'Payment order created',
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      },
      orderId: order._id,
      key: env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature and update order.
 */
async function verifyPayment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // In development without Razorpay keys, auto-verify
    if (env.NODE_ENV === 'development' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
      const order = await Order.findOne({
        'paymentDetails.razorpayOrderId': razorpay_order_id,
      });

      if (!order) {
        return next(new AppError('Order not found for this payment.', 404));
      }

      order.paymentStatus = 'paid';
      order.paymentDetails.razorpayPaymentId = razorpay_payment_id || 'mock_payment_id';
      await order.save();

      return res.status(200).json({
        message: 'Payment verified successfully (development mode)',
        order: {
          id: order._id,
          paymentStatus: order.paymentStatus,
          status: order.status,
        },
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature. Payment verification failed.', 400));
    }

    // Update order payment status
    const order = await Order.findOne({
      'paymentDetails.razorpayOrderId': razorpay_order_id,
    });

    if (!order) {
      return next(new AppError('Order not found for this payment.', 404));
    }

    order.paymentStatus = 'paid';
    order.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    res.status(200).json({
      message: 'Payment verified successfully',
      order: {
        id: order._id,
        paymentStatus: order.paymentStatus,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createPaymentOrder, verifyPayment };
