// backend/discord_bot/test-db-connection.js
require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful!');
    
    // Test discord guild mapping table
    const [results] = await sequelize.query(
      'SELECT * FROM discord_guild_mappings LIMIT 5',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Sample Discord Guild Mappings:');
    console.log(results);
    
    process.exit(0);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

testConnection();