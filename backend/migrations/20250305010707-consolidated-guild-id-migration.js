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
      'users'  // Added users table
    ];
    
    console.log('Starting consolidated guild_id migration...');
    
    for (const table of tables) {
      try {
        // Check if table exists
        let tableExists = true;
        try {
          await queryInterface.describeTable(table);
        } catch (e) {
          console.log(`Table ${table} does not exist - skipping`);
          tableExists = false;
        }
        
        if (!tableExists) continue;
        
        // Check if column already exists
        const tableInfo = await queryInterface.describeTable(table);
        
        if (!tableInfo.guild_id) {
          console.log(`Adding guild_id column to ${table} table`);
          await queryInterface.addColumn(table, 'guild_id', {
            type: Sequelize.UUID,
            allowNull: true
          });
          
          // Add index for better performance
          const indexName = `idx_${table}_guild_id`;
          try {
            await queryInterface.addIndex(table, ['guild_id'], {
              name: indexName
            });
            console.log(`Added index ${indexName}`);
          } catch (indexError) {
            console.log(`Error adding index to ${table}: ${indexError.message}`);
          }
        } else {
          console.log(`guild_id column already exists in ${table} table - skipping`);
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error.message);
      }
    }
    
    // Adding composite indexes for performance
    const compositeIndexes = [
      { table: 'users', fields: ['guild_id', 'status'] },
      { table: 'events', fields: ['guild_id', 'event_time'] },
      { table: 'team_members', fields: ['guild_id', 'user_id'] },
      { table: 'guild_storage_items', fields: ['guild_id', 'item_id'] },
      { table: 'loot_requests', fields: ['guild_id', 'status'] }
    ];
    
    for (const index of compositeIndexes) {
      try {
        const indexName = `idx_${index.table}_${index.fields.join('_')}`;
        let tableExists = true;
        
        try {
          await queryInterface.describeTable(index.table);
        } catch (e) {
          console.log(`Table ${index.table} does not exist - skipping composite index`);
          tableExists = false;
        }
        
        if (!tableExists) continue;
        
        // Check if all fields exist in table
        const tableInfo = await queryInterface.describeTable(index.table);
        const allFieldsExist = index.fields.every(field => tableInfo[field]);
        
        if (allFieldsExist) {
          try {
            await queryInterface.addIndex(index.table, index.fields, {
              name: indexName
            });
            console.log(`Added composite index ${indexName}`);
          } catch (indexError) {
            console.log(`Error adding composite index ${indexName}: ${indexError.message}`);
          }
        } else {
          console.log(`Skipping composite index ${indexName} due to missing fields`);
        }
      } catch (error) {
        console.error(`Error adding composite index for ${index.table}:`, error.message);
      }
    }
    
    console.log('Consolidated guild_id migration completed');
  },

  down: async (queryInterface, Sequelize) => {
    // This is a complex migration to undo
    console.log('This is a consolidation migration and should not be reversed.');
    console.log('If you need to revert changes, create a new migration.');
  }
};