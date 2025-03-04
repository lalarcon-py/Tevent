'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LootRequest extends Model {
    static associate(models) {
      LootRequest.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      LootRequest.belongsTo(models.GuildStorageItem, { foreignKey: 'storage_item_id', as: 'storageItem' });
    }
  }

  LootRequest.init({
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
    storage_item_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(255),
      defaultValue: 'Pending',
      allowNull: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LootRequest',
    tableName: 'loot_requests',
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

  return LootRequest;
}