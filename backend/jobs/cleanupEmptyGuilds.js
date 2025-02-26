// backend/jobs/cleanupEmptyGuilds.js
const cron = require('node-cron');
const { Guild, GuildMember } = require('../models');
const schemaManager = require('../utils/schemaManager');
const { sequelize } = require('../config/database');

// Run once a day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running empty guild cleanup job');
  const t = await sequelize.transaction();
  
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
    
    // Combine lists of guilds to delete
    const guildsToProcess = [...new Set([...guildsToDelete, ...emptyGuilds])];
    
    // Delete each guild
    for (const guild of guildsToProcess) {
      console.log(`Deleting empty guild: ${guild.id} (${guild.name})`);
      
      // Delete guild record
      await guild.destroy({ transaction: t });
      
      // Drop guild schema
      await schemaManager.dropGuildSchema(guild.id);
    }
    
    await t.commit();
    console.log(`Deleted ${guildsToProcess.length} empty guilds`);
  } catch (error) {
    await t.rollback();
    console.error('Guild cleanup job error:', error);
  }
});