// backend/models/RollHistory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RollHistory extends Model {
    static associate(models) {
      RollHistory.belongsTo(models.Guild, { foreignKey: 'guild_id' });
      RollHistory.belongsTo(models.User, { 
        foreignKey: 'winner_id', 
        as: 'winner'
      });
    }
  }

  RollHistory.init({
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
    item_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    item_type: {
      type: DataTypes.STRING
    },
    item_icon: {
      type: DataTypes.STRING
    },
    item_trait: {
      type: DataTypes.STRING
    },
    winner_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    winner_name: {
      type: DataTypes.STRING
    },
    winner_roll: {
      type: DataTypes.INTEGER
    },
    winner_need_type: {
      type: DataTypes.STRING
    },
    roll_results: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    roll_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'RollHistory',
    tableName: 'roll_history',
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

  return RollHistory;
}