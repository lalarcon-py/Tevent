// migrations/yyyy-mm-dd-migrate-from-schemas-to-guild-id.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create a transaction for the entire migration
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Starting migration from schemas to guild_id approach');
      
      // 1. Get all existing guild IDs
      const [guilds] = await queryInterface.sequelize.query(`
        SELECT id, name FROM guilds
      `, { transaction });
      
      console.log(`Found ${guilds.length} guilds to migrate`);
      
      // 2. For each guild, migrate data from its schema to the main schema
      for (const guild of guilds) {
        const guildId = guild.id;
        const schemaName = `guild_${guildId}`;
        
        console.log(`Migrating data for guild "${guild.name}" (${guildId})`);
        
        // Check if the schema exists
        const [schemaExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS(
            SELECT 1 FROM pg_namespace WHERE nspname = '${schemaName}'
          )
        `, { transaction });
        
        if (!schemaExists[0].exists) {
          console.log(`Schema ${schemaName} does not exist, skipping...`);
          continue;
        }
        
        // Get list of tables in the guild schema
        const [tables] = await queryInterface.sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${schemaName}'
        `, { transaction });
        
        // Migrate each table
        for (const tableObj of tables) {
          const tableName = tableObj.table_name;
          console.log(`Migrating table ${tableName} from schema ${schemaName}`);
          
          // Get column info to know what we're dealing with
          const [columns] = await queryInterface.sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = '${schemaName}' AND table_name = '${tableName}'
          `, { transaction });
          
          // Check if the table in public schema has guild_id column
          const [publicColumns] = await queryInterface.sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${tableName}' AND column_name = 'guild_id'
          `, { transaction });
          
          if (publicColumns.length === 0) {
            console.log(`Adding guild_id column to public.${tableName}`);
            await queryInterface.addColumn(
              tableName,
              'guild_id',
              {
                type: Sequelize.UUID,
                allowNull: true, // Initially allow null during migration
                references: {
                  model: 'guilds',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              { transaction }
            );
          }
          
          // Copy data with guild_id
          console.log(`Copying data from ${schemaName}.${tableName} to public.${tableName}`);
          await queryInterface.sequelize.query(`
            INSERT INTO public.${tableName} (${columns.map(c => c.column_name).join(', ')}, guild_id)
            SELECT ${columns.map(c => c.column_name).join(', ')}, '${guildId}'::uuid
            FROM "${schemaName}"."${tableName}"
            ON CONFLICT DO NOTHING
          `, { transaction });
        }
        
        console.log(`Completed migration for guild ${guildId}`);
      }
      
      // 3. Create indexes on guild_id columns for performance
      const tables = ['users', 'items', 'events', 'event_participants', 'teams', 'team_members', 
                      'guild_storage_items', 'loot_requests', 'wishlists'];
      
      for (const table of tables) {
        console.log(`Creating index on ${table}(guild_id)`);
        await queryInterface.addIndex(table, ['guild_id'], {
          name: `idx_${table}_guild_id`,
          transaction
        });
      }
      
      // 4. Make guild_id NOT NULL on all tables now that data is migrated
      for (const table of tables) {
        console.log(`Making guild_id NOT NULL in ${table}`);
        await queryInterface.changeColumn(table, 'guild_id', {
          type: Sequelize.UUID,
          allowNull: false
        }, { transaction });
      }
      
      // Commit all changes
      await transaction.commit();
      console.log('Migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a complex migration to undo - we'd need to recreate schemas 
    // and move data back. Just providing a basic structure here.
    
    console.log('WARNING: Reverting this migration is complex and may result in data loss');
    console.log('WARNING: Ensure you have a backup before proceeding');
    
    // This is a place where the down migration would go, but it's complex enough
    // that it should be carefully implemented based on your specific needs.
  }
};