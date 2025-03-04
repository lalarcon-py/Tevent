'use strict';
const { Model } = require('sequelize');
const defineGuildScopedModel = require('../utils/defineGuildScopedModel');

module.exports = (sequelize, DataTypes) => {
  class Item extends Model {
    static associate(models) {
      Item.hasMany(models.GuildStorageItem, { foreignKey: 'item_id' });
    }
  }

  return defineGuildScopedModel(sequelize, Item, 'Item', {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING },
    rarity: { type: DataTypes.ENUM('Common', 'Rare', 'Epic', 'Legendary') },
    dkpCost: { type: DataTypes.INTEGER, defaultValue: 0 },
    inStorage: { type: DataTypes.BOOLEAN, defaultValue: false }, 
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    icon: { type: DataTypes.STRING }
  }, {
    sequelize,
    modelName: 'Item',
    tableName: 'items',
    freezeTableName: true
  });
};