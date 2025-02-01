const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  discord_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Member'
  },
  status: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Active'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  builds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW'),
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW'),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: false,
  underscored: true
});

module.exports = User;