const path = require('path');
require('dotenv').config();

const baseConfig = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false
    },
    migrationStorageTableName: 'SequelizeMeta',
    migrationPath: path.resolve(__dirname, '../migrations')
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    migrationStorageTableName: 'SequelizeMeta',
    migrationPath: path.resolve(__dirname, '../migrations')
  }
};

// Function to generate config for a specific guild
const getGuildConfig = (guildId = null) => {
  const config = JSON.parse(JSON.stringify(baseConfig));
  
  if (guildId) {
    if (process.env.NODE_ENV === 'production') {
      const url = new URL(process.env.DATABASE_URL);
      url.pathname = `/guild_manager_${guildId}`;
      config.production.url = url.toString();
    } else {
      const url = new URL(process.env.DATABASE_URL);
      url.pathname = `/guild_manager_${guildId}`;
      config.development.url = url.toString();
    }
  }
  
  return config;
};

module.exports = {
  ...baseConfig,
  getGuildConfig
};