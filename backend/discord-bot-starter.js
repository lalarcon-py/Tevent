/**
 * Discord bot starter - use this to start the Discord bot from your backend
 */
const path = require('path');
const fs = require('fs');

console.log('Starting Discord bot from backend...');

// Initialize the app/index.js file
try {
  // Find the app directory relative to this file
  const appIndexPath = path.resolve(__dirname, '../app/index.js');
  
  if (fs.existsSync(appIndexPath)) {
    console.log(`Found app/index.js at: ${appIndexPath}`);
    require(appIndexPath);
    console.log('Discord bot started successfully');
  } else {
    console.error(`ERROR: Could not find app/index.js at ${appIndexPath}`);
    console.error('Current directory: ' + process.cwd());
    console.error('Directory contents: ' + fs.readdirSync(process.cwd()).join(', '));
  }
} catch (error) {
  console.error('Error starting Discord bot:', error);
}
