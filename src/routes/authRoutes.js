const express = require('express');
const router = express.Router();
const {
  sendOtpHandler,
  signupHandler,
  verifyEmailOtpHandler,
  loginEmailHandler,
  verifyOtpHandler,
  refreshTokenHandler,
} = require('../controllers/authController');
const {
  validateSendOtp,
  validateVerifyOtp,
  validateSignup,
  validateLoginEmail,
  validateVerifyEmailOtp,
} = require('../validators/authValidator');

// ─── Phone-based OTP (legacy) ───────────────────────────
// POST /api/auth/send-otp
router.post('/send-otp', validateSendOtp, sendOtpHandler);

// POST /api/auth/verify-otp
router.post('/verify-otp', validateVerifyOtp, verifyOtpHandler);

// ─── Email-based Auth ───────────────────────────────────
// POST /api/auth/signup — Register with name + email, sends email OTP
router.post('/signup', validateSignup, signupHandler);

// POST /api/auth/login-email — Login with email, sends email OTP
router.post('/login-email', validateLoginEmail, loginEmailHandler);

// POST /api/auth/verify-email-otp — Verify email OTP and complete auth
router.post('/verify-email-otp', validateVerifyEmailOtp, verifyEmailOtpHandler);

// ─── Token Management ──────────────────────────────────
// POST /api/auth/refresh
router.post('/refresh', refreshTokenHandler);

module.exports = router;
