// backend/utils/databaseManager.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.mainConnection = null;
  }

  async getMainConnection() {
    if (!this.mainConnection) {
      // Get database URL from environment
      let dbUrl = process.env.DATABASE_URL;
      
      // For development
      if (!dbUrl && process.env.NODE_ENV !== 'production') {
        dbUrl = `postgres://postgres:6384@localhost:5432/guilddb`;
      }
      
      if (!dbUrl) {
        throw new Error("Database URL not configured");
      }
      
      this.mainConnection = new Sequelize(dbUrl, {
        dialect: 'postgres',
        dialectOptions: process.env.NODE_ENV === 'production' ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        } : {},
        logging: process.env.NODE_ENV === 'development' ? console.log : false
      });
      
      await this.mainConnection.authenticate();
      console.log('Connected to main database');
    }
    
    return this.mainConnection;
  }

  async getGuildConnection(guildId) {
    if (!guildId) {
      throw new Error("Guild ID is required");
    }
    
    // Always use the same connection with schema scoping
    const connection = await this.getMainConnection();
    
    // Create schema if it doesn't exist
    const schemaName = `guild_${guildId}`;
    try {
      // Check if schema exists
      const [result] = await connection.query(
        `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = '${schemaName}')`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      if (!result.exists) {
        console.log(`Creating schema ${schemaName}...`);
        await connection.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        
        // Create basic tables
        await connection.query(`
          SET search_path TO "${schemaName}";
          
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            discord_id VARCHAR(255),
            username VARCHAR(255),
            role VARCHAR(50) DEFAULT 'Member',
            status VARCHAR(50) DEFAULT 'Active',
            avatar_url TEXT,
            builds JSONB DEFAULT '[]'::jsonb,
            combat_power INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Reset search path
          SET search_path TO public;
        `);
      }
      
      // Set schema path for current query
      await connection.query(`SET search_path TO "${schemaName}"`);
      
      return connection;
    } catch (error) {
      console.error(`Error in getGuildConnection:`, error);
      await connection.query(`SET search_path TO public`);
      throw error;
    }
  }

  async closeConnection(guildId) {
    // No need to close connections per guild - just reset schema
    try {
      const connection = await this.getMainConnection();
      await connection.query(`SET search_path TO public`);
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

const databaseManager = new DatabaseManager();
module.exports = databaseManager;