'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.DKPTransaction);
      User.hasMany(models.LootRequest, { foreignKey: 'user_id', as: 'lootRequests' });
      // Add other associations here
    }
  }

  User.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for global user records
      references: {
        model: 'guilds',
        key: 'id'
      }
    },
    discord_id: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    avatar_url: { type: DataTypes.STRING },
    builds: { 
      type: DataTypes.JSONB,
      defaultValue: [] 
    },
    combat_power: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    freezeTableName: true,
    scopes: {
      forGuild(guildId) {
        return {
          where: { guild_id: guildId }
        };
      }
    }
  });

  return User;
}