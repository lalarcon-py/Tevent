const { Sequelize } = require('sequelize');
const { createDatabaseConnection, getDbName } = require('../config/database');

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
      const dbName = getDbName(guildId);
      await adminSequelize.query(`CREATE DATABASE "${dbName}"`);
      await adminSequelize.close();

      // Create and store connection to new database
      const guildSequelize = await createDatabaseConnection(guildId);
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
      this.connections.set(guildId, connection);
    }
    return this.connections.get(guildId);
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