const Razorpay = require('razorpay');
const { env } = require('./env');

let razorpayInstance = null;

/**
 * Get or create a Razorpay instance.
 * Lazy initialization to avoid errors when keys are not set in dev.
 */
function getRazorpayInstance() {
  if (!razorpayInstance) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
}

module.exports = { getRazorpayInstance };
