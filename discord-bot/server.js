// A lightweight Express server to accompany the Discord bot
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database connection pool
const useSSL = process.env.DATABASE_USE_SSL === 'true';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : false,
  max: 100, // Increase maximum connections
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
  maxUses: 7500 // Close connections after 7500 queries to prevent memory issues
});

// Test database connection
pool.query('SELECT NOW()')
  .then(result => {
    console.log("Database connection successful, server time:", result.rows[0].now);
  })
  .catch(err => console.error("Database connection error:", err));

// Make pool globally available
global.dbPool = pool;

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic route for checking if the server is running
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Discord bot server is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the Discord bot in the same process with pool access
const bot = require('./index.js');

// Export the pool for use by other modules
module.exports = {
  pool: pool,
  app: app
};

// If bot exports an initialize function, call it with the pool
if (typeof bot.initialize === 'function') {
  bot.initialize(pool);
}
