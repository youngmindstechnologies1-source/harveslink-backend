const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load environment config first
const { validateEnv, env } = require('./src/config/env');
validateEnv();

const connectDB = require('./src/config/db');
const { initializeFirebase } = require('./src/config/firebase');

// Middleware
const errorHandler = require('./src/middleware/errorHandler');
const { authLimiter, generalLimiter } = require('./src/middleware/rateLimiter');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const farmerRoutes = require('./src/routes/farmerRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');

// Initialize Express app
const app = express();

// ─── Security Middleware ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Rate Limiting ──────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'HarvestLink API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
    code: 404,
  });
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Firebase (optional — graceful if not configured)
    initializeFirebase();

    // Start listening
    app.listen(env.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║           🌾 HarvestLink API Server 🌾           ║
╠═══════════════════════════════════════════════════╣
║  Status:      Running                             ║
║  Port:        ${String(env.PORT).padEnd(37)}║
║  Environment: ${env.NODE_ENV.padEnd(37)}║
║  Health:      http://localhost:${env.PORT}/api/health${' '.repeat(Math.max(0, 13 - String(env.PORT).length))}║
╚═══════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = app;
