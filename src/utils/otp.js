const crypto = require('crypto');
const axios = require('axios');
const { hashSHA256 } = require('./crypto');
const { env } = require('../config/env');

/**
 * Generate a 6-digit OTP.
 * In development, returns a predictable OTP (123456).
 * In production, generates a cryptographically random OTP.
 * @returns {string} 6-digit OTP
 */
function generateOtp() {
  if (env.NODE_ENV === 'development') {
    return '123456';
  }
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP using SHA-256.
 * @param {string} otp - Plain OTP
 * @returns {string} Hashed OTP
 */
function hashOtp(otp) {
  return hashSHA256(otp);
}

/**
 * Send OTP via MSG91.
 * In development mode, logs to console instead of sending.
 * @param {string} phone - Phone number (with +91 prefix)
 * @param {string} otp - Plain OTP
 * @returns {Promise<boolean>} Whether the OTP was sent successfully
 */
async function sendOtp(phone, otp) {
  // In development, just log to console
  if (env.NODE_ENV === 'development') {
    console.log(`📱 [DEV] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: env.MSG91_TEMPLATE_ID,
        mobile: phone.replace('+', ''),
        otp,
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.type === 'success') {
      console.log(`✅ OTP sent to ${phone}`);
      return true;
    }

    console.error('❌ MSG91 OTP send failed:', response.data);
    return false;
  } catch (error) {
    console.error('❌ MSG91 API error:', error.message);
    return false;
  }
}

module.exports = { generateOtp, hashOtp, sendOtp };
