const crypto = require('crypto');
const { env } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt text using AES-256-GCM.
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string (iv:authTag:ciphertext) in hex
 */
function encrypt(text) {
  if (!text) return text;

  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt text using AES-256-GCM.
 * @param {string} encryptedText - Encrypted string (iv:authTag:ciphertext)
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash data using SHA-256.
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash in hex
 */
function hashSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { encrypt, decrypt, hashSHA256 };
