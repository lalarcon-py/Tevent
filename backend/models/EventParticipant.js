'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventParticipant extends Model {
    static associate(models) {
      EventParticipant.belongsTo(models.Event, { foreignKey: 'event_id' });
      EventParticipant.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  EventParticipant.init({
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
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['TANK', 'HEALER', 'DPS']]
      }
    }
  }, {
    sequelize,
    modelName: 'EventParticipant',
    tableName: 'event_participants',
    underscored: true,
    timestamps: true
  });

  return EventParticipant;
};