const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address.`,
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional
          return /^\+91\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid Indian phone number. Use +91XXXXXXXXXX format.`,
      },
    },
    role: {
      type: String,
      enum: {
        values: ['farmer', 'customer', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'User role is required'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false, // Never return in queries by default
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (phone index is auto-created by unique:true)
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
