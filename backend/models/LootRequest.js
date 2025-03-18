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
      allowNull: true,
      references: {
        model: 'guild_storage_items',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
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
    },
    need_or_greed: {
      type: DataTypes.ENUM('NEED_ITEM', 'NEED_TRAIT', 'GREED'),
      defaultValue: 'NEED_ITEM',
      allowNull: false
    },
    request_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    expiration_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    roll_value: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    roll_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    won_roll: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
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