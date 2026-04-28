const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'out-for-delivery', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['unpaid', 'paid', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'unpaid',
    },
    paymentDetails: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
    },
    deliveryOTP: {
      type: String, // SHA-256 hashed
    },
    deliveryAddress: {
      label: { type: String },
      fullAddress: { type: String },
      coordinates: { type: [Number] },
    },
  },
  {
    timestamps: true,
  }
);

// Index for customer's orders
orderSchema.index({ customerId: 1, createdAt: -1 });

// Index for farmer's orders
orderSchema.index({ farmerId: 1, createdAt: -1 });

// Index for status filtering
orderSchema.index({ status: 1 });

// Index for payment status
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
