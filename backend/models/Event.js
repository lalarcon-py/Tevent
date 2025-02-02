// models/Event.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('events', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  event_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tanks: {
    type: DataTypes.INTEGER,
    defaultValue: 2
  },
  healers: {
    type: DataTypes.INTEGER,
    defaultValue: 4
  },
  dps: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW')
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW')
  }
}, {
  tableName: 'events',
  timestamps: false,
  underscored: true
});

module.exports = Event;