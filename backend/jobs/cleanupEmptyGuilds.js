// backend/jobs/cleanupEmptyGuilds.js
const cron = require('node-cron');
const { Guild, GuildMember } = require('../models');
const { Op } = require('sequelize'); // Add this import
const schemaManager = require('../utils/schemaManager');
const { sequelize } = require('../config/database');

// Run once a day at midnight
cron.schedule('0 0 * * *', async () => {
  
  try {
    // Find guilds marked for deletion
    const guildsToDelete = await Guild.findAll({
      where: {
        status: 'PENDING_DELETION',
        deletion_scheduled_at: {
          [Op.lte]: new Date()
        }
      }
    });
    
    
    // Find completely empty guilds
    const allGuilds = await Guild.findAll();
    const emptyGuilds = [];
    
    for (const guild of allGuilds) {
      const memberCount = await GuildMember.count({
        where: { guild_id: guild.id }
      });
      
      if (memberCount === 0) {
        emptyGuilds.push(guild);
      }
    }
    
    
    // Process each guild separately
    const allGuildsToProcess = [...guildsToDelete, ...emptyGuilds];
    
    for (const guild of allGuildsToProcess) {

      const t = await sequelize.transaction();
      
      try {
        // Delete guild record within transaction
        await Guild.destroy({
          where: { id: guild.id },
          transaction: t
        });
        
        // Commit transaction
        await t.commit();
        
        // Drop schema OUTSIDE of transaction
        const dropResult = await schemaManager.deleteGuildData(guild.id);
        if (!dropResult) {
          console.error(`Failed to drop schema for guild ${guild.id}, but record was deleted`);
        } else {
        }
      } catch (error) {
        await t.rollback();
        console.error(`Error processing guild ${guild.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Guild cleanup job error:', error);
  }
});