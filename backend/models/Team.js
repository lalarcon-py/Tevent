'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    static associate(models) {
      Team.belongsTo(models.Event, { foreignKey: 'event_id' });
      Team.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      Team.hasMany(models.TeamMember, { foreignKey: 'team_id', as: 'members' });
    }
  }

  Team.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
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
    modelName: 'Team',
    tableName: 'teams',
    underscored: true,
    timestamps: true
  });

  return Team;
};