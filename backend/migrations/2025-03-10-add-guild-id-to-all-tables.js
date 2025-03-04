// backend/migrations/2025-03-10-add-guild-id-to-all-tables.js
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
      'wishlists',
      // Add other guild-specific tables here
    ];
    
    for (const table of tables) {
      await queryInterface.addColumn(table, 'guild_id', {
        type: Sequelize.UUID,
        allowNull: true, // Allow null during migration
        references: {
          model: 'guilds',
          key: 'id'
        },
        onDelete: 'CASCADE'
      });
      
      // Add index for performance
      await queryInterface.addIndex(table, ['guild_id']);
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
      'wishlists',
      // Add other guild-specific tables here
    ];
    
    for (const table of tables) {
      await queryInterface.removeIndex(table, ['guild_id']);
      await queryInterface.removeColumn(table, 'guild_id');
    }
  }
};