'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StorageItem extends Model {
    static associate(models) {
      StorageItem.belongsTo(models.Item, { foreignKey: 'itemId' });
    }
  }
  
  StorageItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    itemId: {
      type: DataTypes.UUID,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    dkpCost: DataTypes.INTEGER,
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    inStorage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'StorageItem',
    tableName: 'storageItems'
  });

  return StorageItem;
};