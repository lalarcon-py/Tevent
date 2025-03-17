// backend/models/Item.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Item extends Model {
    static associate(models) {
      Item.hasMany(models.GuildStorageItem, { foreignKey: 'item_id' });
    }
  }

  Item.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for global items
      references: {
        model: 'guilds',
        key: 'id'
      }
    },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING },
    rarity: { type: DataTypes.ENUM('Common', 'Rare', 'Epic', 'Legendary') },
    dkpCost: { type: DataTypes.INTEGER, defaultValue: 0 },
    inStorage: { type: DataTypes.BOOLEAN, defaultValue: false }, 
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    icon: { type: DataTypes.STRING },
    traits: { 
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [] 
    }
  }, {
    sequelize,
    modelName: 'Item',
    tableName: 'items',
    freezeTableName: true,
    scopes: {
      forGuild(guildId) {
        return {
          where: { guild_id: guildId }
        };
      }
    }
  });

  return Item;
}