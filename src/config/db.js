const mongoose = require('mongoose');
const { env } = require('./env');

/**
 * Connect to MongoDB with retry logic.
 * Retries up to 5 times with a 5-second delay between attempts.
 */
async function connectDB() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
      });

      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      if (attempt === MAX_RETRIES) {
        console.error('❌ All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }

      console.log(`⏳ Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

module.exports = connectDB;
