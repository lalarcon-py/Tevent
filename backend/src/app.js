const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const storageRoutes = require('./routes/storage');
const webhookRoutes = require('./routes/webhooks');
const discordRoutes = require('./routes/discord');
const rolePingConfigRoutes = require('./routes/rolePingConfig');

// Create Express app
const app = express();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()')
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Make pool available in request object
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use('/api', authRoutes);
app.use('/api', guildRoutes);
app.use('/api', userRoutes);
app.use('/api', eventRoutes);
app.use('/api', storageRoutes);
app.use('/api', webhookRoutes);
app.use('/api', discordRoutes);
app.use('/api', rolePingConfigRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

module.exports = app;
