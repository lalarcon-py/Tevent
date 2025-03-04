// config/database.js
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
    return new Sequelize(process.env.DATABASE_URL, {
      ...commonConfig,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 20,  // Increase pool size for production
        min: 5,
        idle: 10000
      }
    });
  } else {
    return new Sequelize('guilddb', 'postgres', '6384', {
      host: 'localhost',
      port: 5432,
      dialect: 'postgres',
      ...commonConfig
    });
  }
};

const sequelize = createBaseConnection();

module.exports = { 
  sequelize
};