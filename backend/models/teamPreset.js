'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamPreset extends Model {
    static associate(models) {
      TeamPreset.belongsTo(models.Event, { foreignKey: 'event_id' });
      TeamPreset.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  TeamPreset.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    teams_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'TeamPreset',
    tableName: 'team_presets',
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

  return TeamPreset;
}