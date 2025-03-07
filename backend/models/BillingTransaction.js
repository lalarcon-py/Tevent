// backend/models/BillingTransaction.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BillingTransaction extends Model {
    static associate(models) {
      BillingTransaction.belongsTo(models.Guild, { foreignKey: 'guild_id' });
    }
  }

  BillingTransaction.init({
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
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    invoice_id: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BillingTransaction',
    tableName: 'billing_transactions',
    underscored: true,
    timestamps: true
  });

  return BillingTransaction;
}