const { validationResult } = require('express-validator');
const User = require('../models/User');
const OtpLog = require('../models/OtpLog');
const Customer = require('../models/Customer');
const Farmer = require('../models/Farmer');
const { generateOtp, hashOtp, sendOtp } = require('../utils/otp');
const { generateEmailOtp, hashEmailOtp, sendEmailOtp } = require('../utils/emailOtp');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { hashSHA256 } = require('../utils/crypto');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, hashes it, stores in OtpLog, and sends via MSG91.
 */
async function sendOtpHandler(req, res, next) {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { phone } = req.body;

    // Check for existing unexpired OTP (throttle)
    const existingOtp = await OtpLog.findOne({
      phone,
      expiresAt: { $gt: new Date() },
    });

    if (existingOtp) {
      const timeLeft = Math.ceil((existingOtp.expiresAt - new Date()) / 1000);
      return res.status(429).json({
        error: `OTP already sent. Please wait ${timeLeft} seconds before requesting a new one.`,
        code: 429,
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    // Delete any previous OTP logs for this phone
    await OtpLog.deleteMany({ phone });

    // Store hashed OTP with 5-minute expiry
    await OtpLog.create({
      phone,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Send OTP (mock in dev, MSG91 in prod)
    const sent = await sendOtp(phone, otp);

    if (!sent && env.NODE_ENV === 'production') {
      return next(new AppError('Failed to send OTP. Please try again.', 500));
    }

    res.status(200).json({
      message: 'OTP sent successfully',
      ...(env.NODE_ENV === 'development' && { otp }), // Include OTP in dev for testing
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/signup
 * Register a new user with name + email, sends email OTP for verification.
 */
async function signupHandler(req, res, next) {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { name, email, role, farmName } = req.body;

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please login instead.',
        code: 409,
      });
    }

    // Check for existing unexpired OTP (throttle)
    const existingOtp = await OtpLog.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (existingOtp) {
      const timeLeft = Math.ceil((existingOtp.expiresAt - new Date()) / 1000);
      return res.status(429).json({
        error: `OTP already sent. Please wait ${timeLeft} seconds before requesting a new one.`,
        code: 429,
      });
    }

    // Generate OTP
    const otp = generateEmailOtp();
    const hashedOtp = hashEmailOtp(otp);

    // Delete any previous OTP logs for this email
    await OtpLog.deleteMany({ email });

    // Store hashed OTP with signup data and 5-minute expiry
    await OtpLog.create({
      email,
      otp: hashedOtp,
      signupData: { name, role: role || 'customer', farmName },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Send OTP via email
    const sent = await sendEmailOtp(email, otp, name);

    if (!sent && env.NODE_ENV === 'production') {
      return next(new AppError('Failed to send verification email. Please try again.', 500));
    }

    res.status(200).json({
      message: 'Verification code sent to your email',
      ...(env.NODE_ENV === 'development' && { otp }), // Include OTP in dev for testing
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-email-otp
 * Validates email OTP, creates User + profile (Customer/Farmer), returns JWT.
 */
async function verifyEmailOtpHandler(req, res, next) {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { email, otp } = req.body;

    // Find OTP log
    const otpLog = await OtpLog.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (!otpLog) {
      return next(new AppError('OTP expired or not found. Please request a new OTP.', 400));
    }

    // Check max attempts
    if (otpLog.attempts >= 3) {
      await OtpLog.deleteOne({ _id: otpLog._id });
      return next(new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 400));
    }

    // Verify OTP hash
    const hashedInput = hashEmailOtp(otp);
    if (hashedInput !== otpLog.otp) {
      otpLog.attempts += 1;
      await otpLog.save();
      return next(new AppError(`Invalid OTP. ${3 - otpLog.attempts} attempts remaining.`, 400));
    }

    // OTP verified — extract signup data
    const signupData = otpLog.signupData || {};
    await OtpLog.deleteOne({ _id: otpLog._id });

    // Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name: signupData.name || '',
        email,
        role: signupData.role || 'customer',
        isVerified: true,
      });
      isNewUser = true;

      // Auto-create profile based on role
      if (user.role === 'customer' && signupData.name) {
        await Customer.create({
          userId: user._id,
          name: signupData.name,
        });
      } else if (user.role === 'farmer' && signupData.name) {
        await Farmer.create({
          userId: user._id,
          farmName: signupData.farmName || `${signupData.name}'s Farm`,
          location: {
            type: 'Point',
            coordinates: [0, 0], // Will be updated in profile setup
            address: 'To be updated',
          },
        });
      }
    } else {
      user.isVerified = true;
      if (signupData.name && !user.name) {
        user.name = signupData.name;
      }
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Store hashed refresh token
    user.refreshToken = hashSHA256(refreshToken);
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    res.status(200).json({
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login-email
 * Login with existing email — sends email OTP.
 */
async function loginEmailHandler(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { email } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({
        error: 'No account found with this email. Please sign up first.',
        code: 404,
      });
    }

    // Check for existing unexpired OTP (throttle)
    const existingOtp = await OtpLog.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (existingOtp) {
      const timeLeft = Math.ceil((existingOtp.expiresAt - new Date()) / 1000);
      return res.status(429).json({
        error: `OTP already sent. Please wait ${timeLeft} seconds before requesting a new one.`,
        code: 429,
      });
    }

    // Generate OTP
    const otp = generateEmailOtp();
    const hashedOtp = hashEmailOtp(otp);

    // Delete any previous OTP logs for this email
    await OtpLog.deleteMany({ email });

    // Store hashed OTP with 5-minute expiry
    await OtpLog.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send OTP via email
    const sent = await sendEmailOtp(email, otp, existingUser.name);

    if (!sent && env.NODE_ENV === 'production') {
      return next(new AppError('Failed to send verification email. Please try again.', 500));
    }

    res.status(200).json({
      message: 'Verification code sent to your email',
      ...(env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-otp
 * Validates OTP, creates/finds User, returns JWT access token and sets refresh token cookie.
 */
async function verifyOtpHandler(req, res, next) {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
    }

    const { phone, otp, role } = req.body;

    // Find OTP log
    const otpLog = await OtpLog.findOne({
      phone,
      expiresAt: { $gt: new Date() },
    });

    if (!otpLog) {
      return next(new AppError('OTP expired or not found. Please request a new OTP.', 400));
    }

    // Check max attempts
    if (otpLog.attempts >= 3) {
      await OtpLog.deleteOne({ _id: otpLog._id });
      return next(new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 400));
    }

    // Verify OTP hash
    const hashedInput = hashOtp(otp);
    if (hashedInput !== otpLog.otp) {
      otpLog.attempts += 1;
      await otpLog.save();
      return next(new AppError(`Invalid OTP. ${3 - otpLog.attempts} attempts remaining.`, 400));
    }

    // OTP verified — delete the log
    await OtpLog.deleteOne({ _id: otpLog._id });

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        phone,
        role: role || 'customer',
        isVerified: true,
      });
      isNewUser = true;
    } else {
      user.isVerified = true;
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Store hashed refresh token
    user.refreshToken = hashSHA256(refreshToken);
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    res.status(200).json({
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Rotates refresh tokens and issues new access tokens.
 */
async function refreshTokenHandler(req, res, next) {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return next(new AppError('Refresh token not provided.', 401));
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token. Please login again.', 401));
    }

    // Find user and verify stored token hash
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user) {
      return next(new AppError('User not found.', 401));
    }

    const hashedToken = hashSHA256(refreshToken);
    if (user.refreshToken !== hashedToken) {
      // Possible token reuse — clear all tokens for security
      user.refreshToken = null;
      await user.save();
      return next(new AppError('Invalid refresh token. Please login again.', 401));
    }

    // Generate new tokens (rotation)
    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    // Store new hashed refresh token
    user.refreshToken = hashSHA256(newRefreshToken);
    await user.save();

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendOtpHandler,
  signupHandler,
  verifyEmailOtpHandler,
  loginEmailHandler,
  verifyOtpHandler,
  refreshTokenHandler,
};
