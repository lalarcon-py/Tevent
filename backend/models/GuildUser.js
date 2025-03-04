// backend/models/GuildUser.js
'use strict';
const { Model } = require('sequelize');
const { createGuildScopedModel } = require('../utils/modelUtils');

module.exports = (sequelize, DataTypes) => {
  class GuildUser extends Model {
    static associate(models) {
      GuildUser.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  return GuildUser.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    username: { type: DataTypes.STRING },
    avatar_url: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'Member' },
    status: { type: DataTypes.STRING, defaultValue: 'Active' },
    builds: { 
      type: DataTypes.JSONB,
      defaultValue: [] 
    },
    combat_power: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'GuildUser',
    tableName: 'guild_users',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeFind: (findOptions) => {
        const guildContext = require('../utils/guildContext');
        const guildId = guildContext.getCurrentGuildId();
        if (guildId) {
          findOptions.where = findOptions.where || {};
          findOptions.where.guild_id = guildId;
        }
      },
      beforeCreate: (instance) => {
        const guildContext = require('../utils/guildContext');
        const guildId = guildContext.getCurrentGuildId();
        if (guildId && !instance.guild_id) {
          instance.guild_id = guildId;
        }
      }
    }
  });
};