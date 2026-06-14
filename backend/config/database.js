// backend/config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const commonConfig = {
  dialect: 'postgres',
  define: {
    timestamps: false,
    underscored: true,
    freezeTableName: true
  }
};

const createBaseConnection = () => {
  if (process.env.NODE_ENV === 'production') {
    // Extract connection components from DATABASE_URL to force IPv4
    const url = new URL(process.env.DATABASE_URL);
    const hostname = url.hostname;
    const port = url.port || 5432;
    const database = url.pathname.substring(1); // Remove leading /
    const username = url.username;
    const password = url.password;
    
    console.log(`[DEBUG] Creating production DB connection to: ${hostname}:${port}/${database}`);
    
    return new Sequelize(database, username, password, {
      host: hostname,
      port: port,
      dialect: 'postgres',
      ...commonConfig,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        // Force IPv4
        family: 4
      },
      pool: {
        max: 20,  // Increase pool size for production
        min: 5,
        idle: 10000
      }
    });
  } else {
    // Uses DATABASE_URL from .env in development
    return new Sequelize(process.env.DATABASE_URL, {
      ...commonConfig,
      dialectOptions: {
        ssl: false,
        family: 4
      },
      logging: false
    });
  }
};

const sequelize = createBaseConnection();

module.exports = { 
  sequelize
};