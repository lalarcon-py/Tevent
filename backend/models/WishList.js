'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WishList extends Model {
    static associate(models) {
      WishList.belongsTo(models.User, { foreignKey: 'user_id' });
      WishList.belongsTo(models.Item, { foreignKey: 'item_id' });
    }
  }

  WishList.init({
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    item_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WishList',
    tableName: 'wishlists',
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

  return WishList;
}