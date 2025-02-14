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
    ...commonConfig,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

let sequelize;
const env = process.env.NODE_ENV || 'development';

if (env === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL, config.production);
} else {
  sequelize = new Sequelize(
    config.development.database,
    config.development.username,
    config.development.password,
    config.development
  );
}

module.exports = { sequelize };