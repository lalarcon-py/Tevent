// backend/discord_bot/test-db-connection.js
require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful!');
    
    // Test discord guild mapping table
    try {
      console.log('Testing SELECT from discord_guild_mappings table...');
      const results = await sequelize.query(
        'SELECT * FROM discord_guild_mappings LIMIT 5',
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('Sample Discord Guild Mappings:');
      console.log(results || 'No results found');
      
      if (results.length === 0) {
        console.log('WARNING: No discord guild mappings found in database');
      }
    } catch (tableError) {
      console.error(`Error querying discord_guild_mappings: ${tableError.message}`);
      console.error(`Table error stack: ${tableError.stack}`);
    }
    
    // Test table structure
    try {
      console.log('\nChecking table structure...');
      const tables = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Found ${tables.length} tables in database:`);
      console.log(tables.map(t => t.table_name).join(', '));
      
      // Check discord_guild_mappings structure
      const columns = await sequelize.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'discord_guild_mappings'",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('\nColumns in discord_guild_mappings:');
      console.log(columns);
    } catch (structError) {
      console.error(`Error checking table structure: ${structError.message}`);
    }
    
    // Test environment variables
    console.log('\nEnvironment Variables:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
    console.log(`TOKEN: ${process.env.TOKEN ? '✅ Set' : '❌ Not set'}`);
    
    // Test a direct connection to mappings with an example server ID
    try {
      console.log('\nTesting direct guild mapping lookup...');
      const exampleDiscordId = '123456789012345678'; // This is just a test ID
      console.log(`Looking up mapping for Discord ID: ${exampleDiscordId}`);
      
      const [mapping] = await sequelize.query(
        `SELECT * FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        { 
          bind: [exampleDiscordId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      console.log('Lookup result:');
      console.log(mapping || 'No mapping found (expected for test ID)');
      console.log('Direct lookup test completed successfully');
    } catch (mappingError) {
      console.error(`Error in direct mapping test: ${mappingError.message}`);
      console.error(`Mapping test error stack: ${mappingError.stack}`);
    }
    
    console.log('\nAll tests completed.');
    process.exit(0);
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConnection();