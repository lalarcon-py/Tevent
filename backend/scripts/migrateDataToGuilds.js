// backend/scripts/migrateDataToGuilds.js
const { sequelize } = require('../config/database');
const db = require('../models');
const { setMigrationMode } = require('../utils/guildContext');

async function migrateDataToGuilds() {
  // Enable migration mode to disable guild filtering
  setMigrationMode(true);
  
  const t = await sequelize.transaction();
  
  try {
    console.log('Starting data migration to populate guild_id field');
    
    // Get all guilds
    const guilds = await db.Guild.findAll();
    console.log(`Found ${guilds.length} guilds to process`);
    
    for (const guild of guilds) {
      console.log(`Processing guild ${guild.id}: ${guild.name}`);
      
      // 1. Items
      await sequelize.query(`
        UPDATE items SET guild_id = :guildId
        WHERE guild_id IS NULL
      `, { 
        replacements: { guildId: guild.id },
        transaction: t
      });
      
      // 2. Events
      await sequelize.query(`
        UPDATE events SET guild_id = :guildId
        WHERE guild_id IS NULL
      `, { 
        replacements: { guildId: guild.id },
        transaction: t
      });
      
      // Similarly, update other tables...
      
      console.log(`Completed updates for guild ${guild.id}`);
    }
    
    await t.commit();
    console.log('Data migration completed successfully');
  } catch (error) {
    await t.rollback();
    console.error('Data migration failed:', error);
    throw error;
  } finally {
    // Disable migration mode
    setMigrationMode(false);
  }
}

// Run the migration if script is executed directly
if (require.main === module) {
  migrateDataToGuilds()
    .then(() => {
      console.log('Migration completed, exiting...');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateDataToGuilds;