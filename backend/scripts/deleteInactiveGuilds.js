// backend/scripts/deleteInactiveGuilds.js
const { Guild, Subscription } = require('../models');
const { Op } = require('sequelize');

async function deleteInactiveGuilds() {
  try {
    console.log('Starting inactive guild cleanup job...');
    
    const now = new Date();
    
    // Find guilds with expired subscriptions
    const guildsToCheck = await Guild.findAll({
      where: {
        status: { [Op.ne]: 'ACTIVE' } // Not active
      },
      include: [{
        model: Subscription,
        required: false
      }]
    });
    
    for (const guild of guildsToCheck) {
      // Calculate guild age
      const guildCreatedAt = new Date(guild.created_at);
      const trialEndDate = new Date(guildCreatedAt);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      // Get last active date (either trial end or subscription expiry)
      let lastActiveDate;
      
      if (guild.Subscription) {
        lastActiveDate = new Date(guild.Subscription.expiry_date);
      } else if (now > trialEndDate) {
        lastActiveDate = trialEndDate;
      } else {
        // Guild is still in trial period
        continue;
      }
      
      // Calculate days since becoming inactive
      const inactiveDays = Math.floor((now - lastActiveDate) / (1000 * 60 * 60 * 24));
      
      // Delete guilds inactive for 14+ days
      if (inactiveDays >= 14) {
        console.log(`Deleting inactive guild ${guild.id}: ${guild.name} - Inactive for ${inactiveDays} days`);
        
        try {
          // Delete guild and all associated data
          await guild.destroy();
          console.log(`Successfully deleted guild ${guild.id}`);
        } catch (deleteError) {
          console.error(`Error deleting guild ${guild.id}:`, deleteError);
        }
      } else {
        console.log(`Guild ${guild.id} is inactive for ${inactiveDays} days (will be deleted after 14 days)`);
      }
    }
    
    console.log('Inactive guild cleanup completed');
  } catch (error) {
    console.error('Error in inactive guild cleanup job:', error);
  }
}

// Run if called directly
if (require.main === module) {
  deleteInactiveGuilds()
    .then(() => {
      console.log('Cleanup process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup process failed:', error);
      process.exit(1);
    });
}

module.exports = deleteInactiveGuilds;