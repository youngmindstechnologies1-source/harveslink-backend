const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Address label cannot exceed 50 characters'],
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
    },
    fullAddress: {
      type: String,
      required: [true, 'Full address is required'],
      trim: true,
    },
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 saved addresses',
      },
    },
    defaultAddressIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// userId index is auto-created by unique:true

// Virtual for default address
customerSchema.virtual('defaultAddress').get(function () {
  if (this.addresses && this.addresses.length > 0) {
    const index = Math.min(this.defaultAddressIndex, this.addresses.length - 1);
    return this.addresses[index];
  }
  return null;
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
