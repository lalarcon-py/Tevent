// backend/utils/schemaManager.js
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
      
      // Create tables in the new schema with proper definitions
      await this.sequelize.query(`
        SET search_path TO "${schemaName}";
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          discord_id VARCHAR(255) NOT NULL,
          username VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'Member',
          status VARCHAR(50) NOT NULL DEFAULT 'Active',
          avatar_url TEXT,
          builds JSONB DEFAULT '[]'::jsonb,
          combat_power INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255),
          rarity VARCHAR(50),
          quantity INTEGER DEFAULT 0,
          icon VARCHAR(255),
          dkp_cost INTEGER DEFAULT 0,
          in_storage BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_time TIMESTAMP NOT NULL,
          location VARCHAR(255),
          tanks INTEGER DEFAULT 2,
          healers INTEGER DEFAULT 4,
          dps INTEGER DEFAULT 24,
          requirements TEXT,
          created_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".event_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID,
          user_id UUID,
          role VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS "${schemaName}".guild_storage_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID NOT NULL,
          quantity INTEGER DEFAULT 0,
          trait VARCHAR(255),
          dkp_cost INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return true;
    } catch (error) {
      console.error(`Failed to create schema for guild ${guildId}:`, error);
      throw error;
    }
  }

  async dropGuildSchema(guildId) {
    const schemaName = `guild_${guildId}`;
    try {
      await this.sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      return true;
    } catch (error) {
      console.error(`Failed to drop schema for guild ${guildId}:`, error);
      throw error;
    }
  }
}

module.exports = new SchemaManager();