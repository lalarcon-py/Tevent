// backend/migrations/add-guild-id-to-all-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      'items',
      'guild_storage_items',
      'events',
      'event_participants', 
      'teams',
      'team_members',
      'loot_requests',
      'wishlists'
    ];
    
    // Add guild_id to all tables
    for (const table of tables) {
      await queryInterface.addColumn(table, 'guild_id', {
        type: Sequelize.UUID,
        allowNull: true, // Allow null initially
        references: {
          model: 'guilds',
          key: 'id'
        },
        onDelete: 'CASCADE'
      });
      
      // Add index for better performance
      await queryInterface.addIndex(table, ['guild_id']);
    }
    
    // Now populate existing records with guild ID
    // Get the first guild ID - this works for your current setup
    const [guildsResult] = await queryInterface.sequelize.query(
      'SELECT id FROM guilds LIMIT 1'
    );
    
    if (guildsResult.length > 0) {
      const guildId = guildsResult[0].id;
      
      // Update all tables to set the guild_id
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET guild_id = '${guildId}' WHERE guild_id IS NULL`
        );
      }
      
      // Now make guild_id required
      for (const table of tables) {
        await queryInterface.changeColumn(table, 'guild_id', {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'guilds',
            key: 'id'
          },
          onDelete: 'CASCADE'
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'items',
      'guild_storage_items',
      'events',
      'event_participants',
      'teams',
      'team_members',
      'loot_requests',
      'wishlists'
    ];
    
    for (const table of tables) {
      await queryInterface.removeIndex(table, ['guild_id']);
      await queryInterface.removeColumn(table, 'guild_id');
    }
  }
};