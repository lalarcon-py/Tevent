const { sequelize } = require('../config/database');

class SchemaManager {
  constructor() {
    this.sequelize = sequelize;
  }

  async createGuildSchema(guildId) {
    const schemaName = `guild_${guildId}`;
    try {
      // Create new schema
      await this.sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Create tables in the new schema
      await this.sequelize.query(`
        SET search_path TO "${schemaName}";
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".users (
          id SERIAL PRIMARY KEY,
          discord_id VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          avatar_url TEXT,
          builds JSONB DEFAULT '[]',
          combat_power INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add other table creation statements for your schema
      `);

      return true;
    } catch (error) {
      console.error(`Failed to create schema for guild ${guildId}:`, error);
      throw error;
    }
  }

  async getGuildSchema(guildId) {
    const schemaName = `guild_${guildId}`;
    try {
      // Check if schema exists
      const [result] = await this.sequelize.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = '${schemaName}'
      `);
      
      return result.length > 0;
    } catch (error) {
      console.error(`Failed to check schema for guild ${guildId}:`, error);
      throw error;
    }
  }
}

module.exports = new SchemaManager();