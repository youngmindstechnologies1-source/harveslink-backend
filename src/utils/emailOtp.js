const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { hashSHA256 } = require('./crypto');
const { env } = require('../config/env');

/**
 * Create a reusable Nodemailer transporter.
 * Uses Gmail SMTP in production, Ethereal (fake SMTP) in development.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (env.NODE_ENV === 'development' && !env.SMTP_USER) {
    // Use Ethereal fake SMTP for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 [DEV] Using Ethereal email for OTP delivery');
    return transporter;
  }

  // Production / configured SMTP (Gmail, etc.)
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env.SMTP_PORT) || 587,
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Generate a 6-digit OTP.
 * In development (without SMTP), returns a predictable OTP.
 * In production, generates a cryptographically random OTP.
 * @returns {string} 6-digit OTP
 */
function generateEmailOtp() {
  if (env.NODE_ENV === 'development' && !env.SMTP_USER) {
    return '123456';
  }
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP using SHA-256.
 * @param {string} otp - Plain OTP
 * @returns {string} Hashed OTP
 */
function hashEmailOtp(otp) {
  return hashSHA256(otp);
}

/**
 * Send OTP via email using Nodemailer.
 * @param {string} email - Recipient email address
 * @param {string} otp - Plain OTP
 * @param {string} userName - Optional user name for personalization
 * @returns {Promise<boolean>} Whether the email was sent successfully
 */
async function sendEmailOtp(email, otp, userName = '') {
  // In development without SMTP config, just log
  if (env.NODE_ENV === 'development' && !env.SMTP_USER) {
    console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    const transport = await getTransporter();
    const greeting = userName ? `Hi ${userName}` : 'Hello';

    const info = await transport.sendMail({
      from: `"HarvestLink 🌾" <${env.SMTP_USER || 'noreply@harvestlink.app'}>`,
      to: email,
      subject: `${otp} is your HarvestLink verification code`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #43A047, #2E7D32); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">🌾 HarvestLink</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Farm Fresh, Delivered Direct</p>
          </div>
          <div style="background: #fff; padding: 32px 24px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">${greeting},</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Your verification code for HarvestLink is:
            </p>
            <div style="background: #F5F5F0; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2E7D32;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
              ⏱ This code expires in <strong>5 minutes</strong>.
            </p>
            <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0;">
              🔒 If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="background: #FAFDF6; padding: 16px 24px; border-radius: 0 0 16px 16px; border: 1px solid #e0e0e0; border-top: none; text-align: center;">
            <p style="color: #9E9E9E; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} HarvestLink • Connecting Farms to Families
            </p>
          </div>
        </div>
      `,
      text: `${greeting}, your HarvestLink verification code is: ${otp}. It expires in 5 minutes.`,
    });

    // In dev with Ethereal, log the preview URL
    if (env.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [DEV] Email preview: ${previewUrl}`);
      }
    }

    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
}

module.exports = { generateEmailOtp, hashEmailOtp, sendEmailOtp };
