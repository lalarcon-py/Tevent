'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DKPTransaction extends Model {
    static associate(models) {
      DKPTransaction.belongsTo(models.User);
    }
  }

  DKPTransaction.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT }
  }, {
    sequelize,
    modelName: 'DKPTransaction',
    tableName: 'DKPTransactions',
    freezeTableName: true
  });

  return DKPTransaction;
};