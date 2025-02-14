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

const config = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    ...commonConfig
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    ...commonConfig,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

module.exports = config;