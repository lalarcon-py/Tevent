'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaticTeam extends Model {
    static associate(models) {
      StaticTeam.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      StaticTeam.hasMany(models.StaticTeamMember, { foreignKey: 'team_id', as: 'members' });
    }
  }

  StaticTeam.init({
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
    modelName: 'StaticTeam',
    tableName: 'static_teams',
    underscored: true,
    timestamps: true
  });

  return StaticTeam;
}