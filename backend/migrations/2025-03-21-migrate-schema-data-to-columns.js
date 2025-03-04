'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all guilds
    const [guilds] = await queryInterface.sequelize.query(`
      SELECT id, name FROM guilds
    `);
    
    console.log(`Found ${guilds.length} guilds to migrate`);
    
    // For each guild, migrate data from its schema to the main schema
    for (const guild of guilds) {
      const guildId = guild.id;
      const schemaName = `guild_${guildId}`;
      
      console.log(`Migrating data for guild "${guild.name}" (${guildId})`);
      
      // Check if the schema exists
      const [schemaExistsResult] = await queryInterface.sequelize.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_namespace WHERE nspname = '${schemaName}'
        )
      `);
      
      const schemaExists = schemaExistsResult[0].exists;
      
      if (!schemaExists) {
        console.log(`Schema ${schemaName} does not exist, skipping...`);
        continue;
      }
      
      // Get list of tables in the guild schema
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${schemaName}'
      `);
      
      // Migrate each table
      for (const tableObj of tables) {
        const tableName = tableObj.table_name;
        console.log(`Migrating table ${tableName} from schema ${schemaName}`);
        
        // Get column info
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = '${schemaName}' AND table_name = '${tableName}'
        `);
        
        // Skip if the table doesn't exist in public schema
        try {
          await queryInterface.sequelize.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
          `);
        } catch (error) {
          console.log(`Table ${tableName} doesn't exist in public schema, skipping`);
          continue;
        }
        
        // Copy data with guild_id
        try {
          console.log(`Copying data from ${schemaName}.${tableName} to public.${tableName}`);
          
          const columnNames = columns.map(c => c.column_name).join(', ');
          
          await queryInterface.sequelize.query(`
            INSERT INTO public.${tableName} (${columnNames}, guild_id)
            SELECT ${columnNames}, '${guildId}'::uuid
            FROM "${schemaName}"."${tableName}"
            ON CONFLICT DO NOTHING
          `);
        } catch (error) {
          console.error(`Error copying data from ${schemaName}.${tableName}:`, error);
        }
      }
      
      console.log(`Completed migration for guild ${guildId}`);
    }
    
    console.log('Making guild_id NOT NULL on all tables');
    
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
        console.log(`Making guild_id NOT NULL in ${table}`);
        await queryInterface.changeColumn(table, 'guild_id', {
          type: Sequelize.UUID,
          allowNull: false
        });
      } catch (error) {
        console.error(`Error making guild_id NOT NULL in ${table}:`, error);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('This migration cannot be safely rolled back as it involves complex data movement');
    console.log('Please restore from backup if you need to revert this migration');
  }
};