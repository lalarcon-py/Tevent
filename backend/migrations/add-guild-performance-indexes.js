// migrations/yyyy-mm-dd-add-guild-performance-indexes.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Essential tables that will need guild_id + other field indexes
    await queryInterface.addIndex('users', ['guild_id', 'status']);
    await queryInterface.addIndex('events', ['guild_id', 'event_time']);
    await queryInterface.addIndex('team_members', ['guild_id', 'user_id']);
    await queryInterface.addIndex('guild_storage_items', ['guild_id', 'item_id']);
    await queryInterface.addIndex('loot_requests', ['guild_id', 'status']);
    
    // For reporting and analytics
    await queryInterface.addIndex('events', ['guild_id', 'created_at']);
    await queryInterface.addIndex('event_participants', ['guild_id', 'user_id', 'event_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the indexes
    await queryInterface.removeIndex('users', ['guild_id', 'status']);
    await queryInterface.removeIndex('events', ['guild_id', 'event_time']);
    await queryInterface.removeIndex('team_members', ['guild_id', 'user_id']);
    await queryInterface.removeIndex('guild_storage_items', ['guild_id', 'item_id']);
    await queryInterface.removeIndex('loot_requests', ['guild_id', 'status']);
    await queryInterface.removeIndex('events', ['guild_id', 'created_at']);
    await queryInterface.removeIndex('event_participants', ['guild_id', 'user_id', 'event_id']);
  }
};