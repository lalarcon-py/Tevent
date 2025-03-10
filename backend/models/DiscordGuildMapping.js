// backend/models/DiscordGuildMapping.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiscordGuildMapping extends Model {
    static associate(models) {
      DiscordGuildMapping.belongsTo(models.Guild, { foreignKey: 'app_guild_id' });
    }
  }

  DiscordGuildMapping.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    discord_guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    app_guild_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guilds',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'DiscordGuildMapping',
    tableName: 'discord_guild_mappings',
    underscored: true,
    timestamps: true
  });

  return DiscordGuildMapping;
};