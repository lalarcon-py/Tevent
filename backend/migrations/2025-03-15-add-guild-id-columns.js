'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // List of tables that need guild_id
    const tables = [
      'items',
      'events',
      'event_participants',
      'teams',
      'team_members',
      'team_presets',
      'guild_storage_items',
      'loot_requests',
      'wishlists'
    ];
    
    for (const table of tables) {
      try {
        // Check if column already exists
        const tableInfo = await queryInterface.describeTable(table);
        
        if (!tableInfo.guild_id) {
          console.log(`Adding guild_id column to ${table} table`);
          await queryInterface.addColumn(table, 'guild_id', {
            type: Sequelize.UUID,
            allowNull: true, // Allow null initially for existing data
            references: {
              model: 'guilds',
              key: 'id'
            },
            onDelete: 'CASCADE'
          });
          
          // Add index for better performance
          await queryInterface.addIndex(table, ['guild_id'], {
            name: `idx_${table}_guild_id`
          });
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'items',
      'events',
      'event_participants',
      'teams',
      'team_members',
      'team_presets',
      'guild_storage_items',
      'loot_requests',
      'wishlists'
    ];
    
    for (const table of tables) {
      try {
        await queryInterface.removeIndex(table, `idx_${table}_guild_id`);
        await queryInterface.removeColumn(table, 'guild_id');
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
      }
    }
  }
};