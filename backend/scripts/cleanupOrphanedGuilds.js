// backend/scripts/cleanupOrphanedGuilds.js
require('dotenv').config();
const { Guild, GuildMember } = require('../models');
const { Op } = require('sequelize');
const schemaManager = require('../utils/schemaManager');
const { sequelize } = require('../config/database');

async function cleanupOrphanedGuilds() {
  console.log('=== Starting manual guild cleanup ===');
  
  try {
    // 1. Get all guild IDs from the database
    const guilds = await Guild.findAll({
      attributes: ['id', 'name']
    });
    
    const guildIds = guilds.map(g => g.id);
    console.log(`Found ${guildIds.length} guilds in database`);
    
    // 2. Get all guild member counts
    const guildMemberCounts = {};
    for (const guildId of guildIds) {
      const count = await GuildMember.count({
        where: { guild_id: guildId }
      });
      guildMemberCounts[guildId] = count;
      console.log(`Guild ${guildId} has ${count} members`);
      
      // 3. Delete empty guilds
      if (count === 0) {
        console.log(`Deleting empty guild ${guildId}`);
        
        // Delete guild record
        await Guild.destroy({
          where: { id: guildId }
        });
        
        // Drop schema outside of any transaction
        const dropResult = await schemaManager.dropGuildSchema(guildId);
        console.log(`Schema drop result: ${dropResult ? 'success' : 'failed'}`);
      }
    }
    
    // 4. Find all guild schemas in the database
    const [schemas] = await sequelize.query(`
      SELECT nspname FROM pg_catalog.pg_namespace 
      WHERE nspname LIKE 'guild_%'
    `);
    
    console.log(`Found ${schemas.length} guild schemas in database`);
    
    // 5. Check for orphaned schemas (schemas without a guild record)
    for (const schema of schemas) {
      const schemaName = schema.nspname;
      const guildId = schemaName.replace('guild_', '');
      
      if (!guildIds.includes(guildId)) {
        console.log(`Found orphaned schema ${schemaName} with no corresponding guild record`);
        
        // Drop the orphaned schema
        console.log(`Dropping orphaned schema ${schemaName}`);
        await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      }
    }
    
    console.log('=== Guild cleanup completed ===');
  } catch (error) {
    console.error('Error during guild cleanup:', error);
  }
}

// Execute the function if running directly
if (require.main === module) {
  cleanupOrphanedGuilds()
    .then(() => {
      console.log('Cleanup completed, exiting...');
      process.exit(0);
    })
    .catch(err => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = cleanupOrphanedGuilds;