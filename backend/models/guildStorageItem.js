'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GuildStorageItem extends Model {
    static associate(models) {
      GuildStorageItem.belongsTo(models.Item, { foreignKey: 'item_id' });
      GuildStorageItem.hasMany(models.LootRequest, { foreignKey: 'storage_item_id', as: 'requests' });
    }
  }

  GuildStorageItem.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    },
    trait: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    dkp_cost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GuildStorageItem',
    tableName: 'guild_storage_items',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  });

  return GuildStorageItem;
};