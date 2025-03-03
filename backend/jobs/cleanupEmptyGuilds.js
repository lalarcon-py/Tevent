// backend/jobs/cleanupEmptyGuilds.js - Update for better logging and error handling
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
    
    console.log(`Found ${guildsToDelete.length} guilds marked for deletion`);
    
    // Find completely empty guilds
    const allGuilds = await Guild.findAll();
    const emptyGuilds = [];
    
    for (const guild of allGuilds) {
      const memberCount = await GuildMember.count({
        where: { guild_id: guild.id }
      });
      
      if (memberCount === 0) {
        console.log(`Found empty guild: ${guild.id} (${guild.name})`);
        emptyGuilds.push(guild);
      }
    }
    
    console.log(`Found ${emptyGuilds.length} additional empty guilds that weren't marked for deletion`);
    
    // Combine lists of guilds to delete
    const guildsToProcess = [...new Set([...guildsToDelete, ...emptyGuilds])];
    
    // Delete each guild
    for (const guild of guildsToProcess) {
      console.log(`Deleting empty guild: ${guild.id} (${guild.name})`);
      
      try {
        // Delete guild record
        await guild.destroy({ transaction: t });
        
        // Drop guild schema
        const dropResult = await schemaManager.dropGuildSchema(guild.id);
        if (!dropResult) {
          console.error(`Failed to drop schema for guild ${guild.id}, but record was deleted`);
        }
      } catch (guildError) {
        console.error(`Error deleting guild ${guild.id}:`, guildError);
        // Continue with other guilds
      }
    }
    
    await t.commit();
    console.log(`Deleted ${guildsToProcess.length} empty guilds`);
  } catch (error) {
    await t.rollback();
    console.error('Guild cleanup job error:', error);
  }
});