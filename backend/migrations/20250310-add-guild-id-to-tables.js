// backend/migrations/20250310-add-guild-id-to-tables.js
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
    
    for (const table of tables) {
      try {
        // Check if column already exists before adding it
        const tableInfo = await queryInterface.describeTable(table);
        
        if (!tableInfo.guild_id) {
          await queryInterface.addColumn(table, 'guild_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'guilds',
              key: 'id'
            },
            onDelete: 'CASCADE'
          });
          
          // Add index for better performance
          await queryInterface.addIndex(table, ['guild_id']);
        } else {
          console.log(`guild_id column already exists in ${table} - skipping`);
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error.message);
      }
    }
    
    // Rest of your migration can continue...
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
      try {
        await queryInterface.removeIndex(table, ['guild_id']);
        await queryInterface.removeColumn(table, 'guild_id');
      } catch (error) {
        console.log(`Error removing column/index from ${table}:`, error.message);
      }
    }
  }
};