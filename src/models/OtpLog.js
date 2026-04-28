const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  otp: {
    type: String, // SHA-256 hashed
    required: [true, 'OTP hash is required'],
  },
  // Extra signup data stored temporarily until OTP is verified
  signupData: {
    name: String,
    role: String,
    farmName: String,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum OTP verification attempts exceeded'],
  },
});

// Index for phone and email lookups
otpLogSchema.index({ phone: 1 });
otpLogSchema.index({ email: 1 });

// TTL index — auto-delete documents after expiresAt
otpLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpLog = mongoose.model('OtpLog', otpLogSchema);

module.exports = OtpLog;

