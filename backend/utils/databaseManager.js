const { Sequelize } = require('sequelize');
const { createDatabaseConnection } = require('../config/database');

class DatabaseManager {
  constructor() {
    this.connections = new Map();
  }

  async createGuildDatabase(guildId) {
    try {
      // Create admin connection to create new database
      const adminSequelize = new Sequelize(process.env.DATABASE_URL || {
        host: process.env.DB_HOST,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dialect: 'postgres'
      });

      // Create new database for guild
      const dbName = `guild_manager_${guildId}`;
      await adminSequelize.query(`CREATE DATABASE "${dbName}"`);
      await adminSequelize.close();

      // Create and store connection to new database
      const guildSequelize = await createDatabaseConnection(guildId);
      
      // Force schema to be set correctly for this connection
      await guildSequelize.query(`SET search_path TO "guild_${guildId}"`);
      
      // Add hooks to force all queries to use correct schema
      guildSequelize.addHook('beforeQuery', (options) => {
        options.schema = `guild_${guildId}`;
      });
      
      await guildSequelize.sync();
      this.connections.set(guildId, guildSequelize);

      return guildSequelize;
    } catch (error) {
      console.error(`Failed to create database for guild ${guildId}:`, error);
      throw error;
    }
  }

  async getGuildConnection(guildId) {
    if (!this.connections.has(guildId)) {
      const connection = await createDatabaseConnection(guildId);
      
      // Explicitly set schema immediately after connection
      await connection.query(`SET search_path TO "guild_${guildId}"`);
      
      // Add query hook to enforce schema for all queries
      connection.addHook('beforeQuery', (options) => {
        options.schema = `guild_${guildId}`;
      });
      
      this.connections.set(guildId, connection);
    }
    
    const connection = this.connections.get(guildId);
    
    // Always ensure schema is set correctly when retrieving connection
    try {
      await connection.query(`SET search_path TO "guild_${guildId}"`);
    } catch (error) {
      console.error(`Failed to set schema for guild ${guildId}:`, error);
    }
    
    return connection;
  }

  async closeConnection(guildId) {
    const connection = this.connections.get(guildId);
    if (connection) {
      await connection.close();
      this.connections.delete(guildId);
    }
  }
}

const databaseManager = new DatabaseManager();
module.exports = databaseManager;