const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Generate a JWT access token.
 * @param {Object} payload - Token payload (id, role)
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

/**
 * Generate a JWT refresh token.
 * @param {Object} payload - Token payload (id)
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
}

/**
 * Verify a JWT token.
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret to verify against
 * @returns {Object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };
