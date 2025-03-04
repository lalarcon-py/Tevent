// backend/migrations/2025-03-10-add-guild-id-to-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // List of tables that need guild_id column
    const tables = [
      'items',
      'events',
      'event_participants',
      'teams',
      'team_members',
      'guild_storage_items',
      'loot_requests',
      'team_presets',
      'wishlists'
      // Add other guild-specific tables here
    ];
    
    for (const table of tables) {
      try {
        // Check if column already exists
        const tableInfo = await queryInterface.describeTable(table);
        
        if (!tableInfo.guild_id) {
          console.log(`Adding guild_id column to ${table} table`);
          await queryInterface.addColumn(table, 'guild_id', {
            type: Sequelize.UUID,
            allowNull: true // Allow null initially for existing data
          });
          
          // Add index for better performance
          await queryInterface.addIndex(table, ['guild_id']);
        } else {
          console.log(`guild_id column already exists in ${table} table`);
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }
    
    console.log('Migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'items',
      'events',
      'event_participants',
      'teams',
      'team_members',
      'guild_storage_items',
      'loot_requests',
      'team_presets',
      'wishlists'
      // Add other guild-specific tables here
    ];
    
    for (const table of tables) {
      try {
        // Remove the index first
        await queryInterface.removeIndex(table, ['guild_id']);
        
        // Then remove the column
        await queryInterface.removeColumn(table, 'guild_id');
      } catch (error) {
        console.error(`Error reverting table ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }
  }
};