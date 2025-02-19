require('dotenv').config();

const baseConfig = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    migrationStorageTableName: 'SequelizeMeta',
    migrationPath: path.resolve(__dirname, '../migrations')
  },
  production: {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    url: process.env.DATABASE_URL,
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
      config.development.database = `guild_manager_${guildId}`;
    }
  }
  
  return config;
};

module.exports = {
  ...baseConfig,
  getGuildConfig
};