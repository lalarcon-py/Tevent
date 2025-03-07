'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventAbsentee extends Model {
    static associate(models) {
      EventAbsentee.belongsTo(models.Event, { foreignKey: 'event_id' });
      EventAbsentee.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  EventAbsentee.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guilds',
        key: 'id'
      }
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
    }
  }, {
    sequelize,
    modelName: 'EventAbsentee',
    tableName: 'event_absentees',
    underscored: true,
    timestamps: true
  });

  return EventAbsentee;
}