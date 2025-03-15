'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      Event.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      Event.hasMany(models.EventParticipant, { foreignKey: 'event_id', as: 'participants' });
      Event.hasMany(models.EventAbsentee, { foreignKey: 'event_id', as: 'absentees' });
    }
  }

  Event.init({
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    dkp_value: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    event_time: {
      type: DataTypes.DATE,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING
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
    requirements: {
      type: DataTypes.TEXT
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Event',
    tableName: 'events',
    underscored: true,
    timestamps: true,
    scopes: {
      forGuild(guildId) {
        return {
          where: { guild_id: guildId }
        };
      }
    }
  });

  return Event;
}