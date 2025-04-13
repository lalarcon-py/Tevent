'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaticTeamGroup extends Model {
    static associate(models) {
      StaticTeamGroup.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      StaticTeamGroup.belongsTo(models.Guild, { foreignKey: 'guild_id', as: 'guild' });
      StaticTeamGroup.hasMany(models.StaticTeam, { foreignKey: 'group_id', as: 'teams' });
    }
  }

  StaticTeamGroup.init({
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    modelName: 'StaticTeamGroup',
    tableName: 'static_team_groups',
    underscored: true,
    timestamps: true
  });

  return StaticTeamGroup;
}