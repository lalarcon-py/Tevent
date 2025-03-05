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

// We're now simply returning the config without schema manipulation
const getGuildConfig = (guildId = null) => {
  // Just return the base config - no schema switching needed
  return baseConfig;
};

module.exports = {
  ...baseConfig,
  getGuildConfig
};