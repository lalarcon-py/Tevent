// backend/models/DiscordChannelConfig.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiscordChannelConfig extends Model {
    static associate(models) {
      DiscordChannelConfig.belongsTo(models.Guild, { foreignKey: 'guild_id' });
    }
  }

  DiscordChannelConfig.init({
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
    discord_guild_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    channel_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    channel_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'DiscordChannelConfig',
    tableName: 'discord_channel_configs',
    underscored: true,
    timestamps: true
  });

  return DiscordChannelConfig;
};