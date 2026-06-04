/**
 * Main entry point for TeventGM project
 * This file forwards to the Discord bot but includes proper error handling
 */

const fs = require('fs');
const path = require('path');

function checkDependencies() {
  // Logging for env variables, can uncomment if facing issues with them
  const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please ensure all required environment variables are set in .env file or environment');
    return false;
  }
  
  return true;
}

// BOT WILL NOT LOAD WITHOUT DEPENDENCIES, BUT THIS PREVENTS CRASHES AND PROVIDES ERROR MESSAGES
if (checkDependencies()) {
  try {
    const discordBot = require('./discord-bot/index.js');
    module.exports = discordBot;
    console.log('Discord bot loaded successfully');
  } catch (error) {
    console.error('Error loading Discord bot:', error.message);
    console.error(error.stack);
    // Export a dummy object to prevent crashes
    module.exports = {
      initialize: () => false,
      error: error.message
    };
  }
} else {
  console.error('Dependency check failed, bot may not function correctly');
  module.exports = {
    initialize: () => false,
    error: 'Dependency check failed'
  };
}