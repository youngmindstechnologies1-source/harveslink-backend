const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const farmerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    farmName: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
      maxlength: [100, 'Farm name cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    coverPhoto: {
      type: String, // Cloudinary URL
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        required: [true, 'Farm address is required'],
        trim: true,
      },
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    bankDetails: {
      accountNumber: {
        type: String, // Stored encrypted
      },
      ifsc: {
        type: String, // Stored encrypted
      },
      accountHolder: {
        type: String, // Stored encrypted
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 2dsphere index for geospatial queries
farmerSchema.index({ location: '2dsphere' });

// Text index for farm name search
farmerSchema.index({ farmName: 'text' });

// userId index is auto-created by unique:true

// Encrypt bank details before saving
farmerSchema.pre('save', function (next) {
  if (this.isModified('bankDetails')) {
    if (this.bankDetails.accountNumber) {
      this.bankDetails.accountNumber = encrypt(this.bankDetails.accountNumber);
    }
    if (this.bankDetails.ifsc) {
      this.bankDetails.ifsc = encrypt(this.bankDetails.ifsc);
    }
    if (this.bankDetails.accountHolder) {
      this.bankDetails.accountHolder = encrypt(this.bankDetails.accountHolder);
    }
  }
  next();
});

// Method to get decrypted bank details
farmerSchema.methods.getDecryptedBankDetails = function () {
  return {
    accountNumber: this.bankDetails.accountNumber
      ? decrypt(this.bankDetails.accountNumber)
      : null,
    ifsc: this.bankDetails.ifsc ? decrypt(this.bankDetails.ifsc) : null,
    accountHolder: this.bankDetails.accountHolder
      ? decrypt(this.bankDetails.accountHolder)
      : null,
  };
};

// Virtual for products
farmerSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'farmerId',
});

const Farmer = mongoose.model('Farmer', farmerSchema);

module.exports = Farmer;
