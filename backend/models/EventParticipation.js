// models/EventParticipant.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventParticipant = sequelize.define('event_participants', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('TANK', 'HEALER', 'DPS'),
    allowNull: false
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
  tableName: 'event_participants',
  timestamps: false,
  underscored: true
});

module.exports = EventParticipation;