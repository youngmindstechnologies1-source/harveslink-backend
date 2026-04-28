const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: ['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'other'],
        message: '{VALUE} is not a valid product category',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['kg', 'gram', 'litre', 'piece', 'dozen', 'bunch'],
        message: '{VALUE} is not a valid unit',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    harvestDate: {
      type: Date,
    },
    photo: {
      type: String, // Cloudinary URL
    },
    aiVerified: {
      type: Boolean,
      default: false,
    },
    aiVerificationResult: {
      fresh: { type: Boolean },
      confidence: { type: Number },
      reason: { type: String },
    },
    mandiSuggestedPrice: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for farmer's products
productSchema.index({ farmerId: 1, isActive: 1 });

// Text index for product search
productSchema.index({ name: 'text' });

// Index for category filtering
productSchema.index({ category: 1, isActive: 1 });

// Index for price-based sorting
productSchema.index({ price: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
