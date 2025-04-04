/**
 * Main entry point for TeventGM project in Docker environment
 * This file is used when the application is deployed in a Docker container
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Setup logging with timestamps
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [${level}] ${message}`);
}

// Initialize database connection
logWithTimestamp('Initializing database connection');
const useSSL = process.env.DATABASE_USE_SSL === 'true';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : false,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500
});

// Test database connection before proceeding
async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logWithTimestamp(`Database connection successful, server time: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    logWithTimestamp(`Database connection error: ${err.message}`, 'ERROR');
    return false;
  }
}

// Main initialization function
async function initialize() {
  logWithTimestamp('Starting TeventGM application');
  
  // Check environment variables
  const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logWithTimestamp(`Missing required environment variables: ${missingVars.join(', ')}`, 'ERROR');
    logWithTimestamp('Please ensure all required environment variables are set', 'ERROR');
    return false;
  }
  
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    logWithTimestamp('Database connection failed, cannot proceed', 'ERROR');
    return false;
  }
  
  // Import event signups module
  try {
    const eventSignups = require('../discord-bot/utils/eventSignups');
    logWithTimestamp('EventSignups module loaded successfully');
    
    // Initialize the eventSignups module with the database pool
    eventSignups.setPool(pool);
    logWithTimestamp('EventSignups module initialized with database pool');
  } catch (err) {
    logWithTimestamp(`Failed to load eventSignups module: ${err.message}`, 'ERROR');
    logWithTimestamp(err.stack, 'ERROR');
  }
  
  // Load Discord bot (server will handle the bot startup)
  try {
    logWithTimestamp('Starting Discord bot server');
    require('../discord-bot/server.js');
    logWithTimestamp('Discord bot server started successfully');
  } catch (err) {
    logWithTimestamp(`Failed to start Discord bot server: ${err.message}`, 'ERROR');
    logWithTimestamp(err.stack, 'ERROR');
    return false;
  }
  
  return true;
}

// Start the application
initialize().then(success => {
  if (success) {
    logWithTimestamp('TeventGM application started successfully');
  } else {
    logWithTimestamp('TeventGM application failed to start correctly', 'ERROR');
    // Keep process running even if there were issues, to allow for troubleshooting
  }
}).catch(err => {
  logWithTimestamp(`Unexpected error during initialization: ${err.message}`, 'ERROR');
  logWithTimestamp(err.stack, 'ERROR');
});

// Create directory if it doesn't exist
try {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
} catch (err) {
  logWithTimestamp(`Failed to create logs directory: ${err.message}`, 'WARN');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logWithTimestamp('Received SIGINT, shutting down gracefully');
  await pool.end();
  logWithTimestamp('Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logWithTimestamp('Received SIGTERM, shutting down gracefully');
  await pool.end();
  logWithTimestamp('Database connections closed');
  process.exit(0);
});

// Export key objects for other modules
module.exports = {
  pool,
  logWithTimestamp
};
