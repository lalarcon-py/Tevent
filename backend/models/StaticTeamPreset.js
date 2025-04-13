'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaticTeamPreset extends Model {
    static associate(models) {
      // A preset belongs to a guild
      StaticTeamPreset.belongsTo(models.Guild, {
        foreignKey: 'guild_id',
        as: 'guild'
      });

      // A preset has many static teams
      StaticTeamPreset.hasMany(models.StaticTeam, {
        foreignKey: 'preset_id',
        as: 'teams'
      });
    }
  }

  StaticTeamPreset.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guilds',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'StaticTeamPreset',
    tableName: 'static_team_presets',
    underscored: true,
    timestamps: true
  });

  return StaticTeamPreset;
};
