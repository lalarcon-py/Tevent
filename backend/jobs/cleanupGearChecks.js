// backend/jobs/cleanupGearChecks.js
const cron = require('node-cron');
const gearCheckController = require('../controllers/gearCheckController');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  
  try {
    const result = await gearCheckController.cleanupOldGearChecks();
  } catch (error) {
    console.error('Error running gear check cleanup job:', error);
  }
});