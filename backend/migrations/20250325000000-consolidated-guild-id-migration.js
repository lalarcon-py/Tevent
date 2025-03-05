'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Starting consolidated guild_id migration...');
    
    // Tables that need guild_id column
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
    
    // Process each table
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
            allowNull: true,
            references: {
              model: 'guilds',
              key: 'id'
            },
            onDelete: 'CASCADE'
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
    
    // Define and add composite indexes
    const compositeIndexes = [
      { table: 'users', fields: ['guild_id', 'status'], name: 'idx_users_guild_id_status' },
      { table: 'events', fields: ['guild_id', 'event_time'], name: 'idx_events_guild_id_event_time' },
      { table: 'team_members', fields: ['guild_id', 'user_id'], name: 'idx_team_members_guild_id_user_id' },
      { table: 'guild_storage_items', fields: ['guild_id', 'item_id'], name: 'idx_guild_storage_items_guild_id_item_id' },
      { table: 'loot_requests', fields: ['guild_id', 'status'], name: 'idx_loot_requests_guild_id_status' },
      { table: 'events', fields: ['guild_id', 'created_at'], name: 'idx_events_guild_id_created_at' },
      { table: 'event_participants', fields: ['guild_id', 'user_id', 'event_id'], name: 'idx_event_participants_complex' }
    ];
    
    for (const index of compositeIndexes) {
      try {
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
            // Check if index exists
            const [existingIndexes] = await queryInterface.sequelize.query(
              `SELECT indexname FROM pg_indexes WHERE tablename = '${index.table}' AND indexname = '${index.name}'`
            );
            
            if (existingIndexes.length === 0) {
              await queryInterface.addIndex(index.table, index.fields, {
                name: index.name
              });
              console.log(`Added composite index ${index.name}`);
            } else {
              console.log(`Composite index ${index.name} already exists - skipping`);
            }
          } catch (indexError) {
            console.log(`Error adding composite index ${index.name}: ${indexError.message}`);
          }
        } else {
          console.log(`Skipping composite index ${index.name} due to missing fields`);
        }
      } catch (error) {
        console.error(`Error adding composite index for ${index.table}:`, error.message);
      }
    }
    
    console.log('Consolidated guild_id migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Reverting consolidated guild_id migration...');
    
    // Remove composite indexes first
    const compositeIndexes = [
      { table: 'users', name: 'idx_users_guild_id_status' },
      { table: 'events', name: 'idx_events_guild_id_event_time' },
      { table: 'team_members', name: 'idx_team_members_guild_id_user_id' },
      { table: 'guild_storage_items', name: 'idx_guild_storage_items_guild_id_item_id' },
      { table: 'loot_requests', name: 'idx_loot_requests_guild_id_status' },
      { table: 'events', name: 'idx_events_guild_id_created_at' },
      { table: 'event_participants', name: 'idx_event_participants_complex' }
    ];
    
    for (const index of compositeIndexes) {
      try {
        await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${index.name}`);
        console.log(`Removed index ${index.name}`);
      } catch (error) {
        console.error(`Error removing index ${index.name}:`, error.message);
      }
    }
    
    // Remove guild_id columns
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
        await queryInterface.removeColumn(table, 'guild_id');
        console.log(`Removed guild_id column from ${table}`);
      } catch (error) {
        console.error(`Error removing guild_id from ${table}:`, error.message);
      }
    }
    
    console.log('Reversion completed');
  }
};