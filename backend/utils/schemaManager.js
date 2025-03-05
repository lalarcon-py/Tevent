// utils/schemaManager.js
const { sequelize } = require('../config/database');
const logger = require('./logger');

// This utility is now simplified to only work with guild_id filters
// No more creating or switching schemas

const initializeGuildData = async (guildId) => {
  try {
    logger.info(`Initializing data for guild ${guildId}`);
    // No need to create a schema, just return the guild ID
    return guildId;
  } catch (error) {
    logger.error(`Error initializing guild data: ${error.message}`);
    throw error;
  }
};

const deleteGuildData = async (guildId) => {
  try {
    logger.info(`Deleting data for guild ${guildId}`);
    
    // Delete all data for this guild
    await sequelize.transaction(async (t) => {
      await sequelize.query(`DELETE FROM users WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
      
      await sequelize.query(`DELETE FROM events WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
      
      await sequelize.query(`DELETE FROM teams WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
      
      await sequelize.query(`DELETE FROM guild_storage_items WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
      
      await sequelize.query(`DELETE FROM loot_requests WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
      
      await sequelize.query(`DELETE FROM wishlists WHERE guild_id = :guildId`, {
        replacements: { guildId },
        transaction: t
      });
    });
    
    return true;
  } catch (error) {
    logger.error(`Error deleting guild data: ${error.message}`);
    throw error;
  }
};

module.exports = {
  initializeGuildData,
  deleteGuildData
};