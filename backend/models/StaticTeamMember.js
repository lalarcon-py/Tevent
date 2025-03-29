'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaticTeamMember extends Model {
    static associate(models) {
      StaticTeamMember.belongsTo(models.StaticTeam, { foreignKey: 'team_id' });
      StaticTeamMember.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  StaticTeamMember.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    team_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'static_teams',
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
    guild_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guilds',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'DPS'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    selected_build: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'StaticTeamMember',
    tableName: 'static_team_members',
    underscored: true,
    timestamps: true
  });

  return StaticTeamMember;
}