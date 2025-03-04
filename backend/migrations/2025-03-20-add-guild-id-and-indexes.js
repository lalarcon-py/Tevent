'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // List of tables that need guild_id
    const tables = [
      'users',
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
    
    // Add composite indexes for performance
    const compositeIndexes = [
      { table: 'users', fields: ['guild_id', 'status'] },
      { table: 'events', fields: ['guild_id', 'event_time'] },
      { table: 'team_members', fields: ['guild_id', 'user_id'] },
      { table: 'guild_storage_items', fields: ['guild_id', 'item_id'] },
      { table: 'loot_requests', fields: ['guild_id', 'status'] }
    ];
    
    for (const index of compositeIndexes) {
      try {
        await queryInterface.addIndex(index.table, index.fields, {
          name: `idx_${index.table}_${index.fields.join('_')}`
        });
      } catch (error) {
        console.error(`Error adding composite index to ${index.table}:`, error);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = [
      'users',
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
    
    // Drop composite indexes
    const compositeIndexes = [
      { table: 'users', fields: ['guild_id', 'status'] },
      { table: 'events', fields: ['guild_id', 'event_time'] },
      { table: 'team_members', fields: ['guild_id', 'user_id'] },
      { table: 'guild_storage_items', fields: ['guild_id', 'item_id'] },
      { table: 'loot_requests', fields: ['guild_id', 'status'] }
    ];
    
    for (const index of compositeIndexes) {
      try {
        await queryInterface.removeIndex(index.table, `idx_${index.table}_${index.fields.join('_')}`);
      } catch (error) {
        console.error(`Error removing composite index from ${index.table}:`, error);
      }
    }
    
    for (const table of tables) {
      try {
        await queryInterface.removeIndex(table, `idx_${table}_guild_id`);
        await queryInterface.removeColumn(table, 'guild_id');
      } catch (error) {
        console.error(`Error removing guild_id from ${table}:`, error);
      }
    }
  }
};