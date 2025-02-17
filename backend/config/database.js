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

// Create the base sequelize connection
const createBaseConnection = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return new Sequelize(process.env.DATABASE_URL, {
      ...commonConfig,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
  } else {
    return new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        ...commonConfig
      }
    );
  }
};

const sequelize = createBaseConnection();

// Function to get schema name for a guild
const getSchemaName = (guildId) => `guild_${guildId}`;

module.exports = { 
  sequelize,
  getSchemaName
};