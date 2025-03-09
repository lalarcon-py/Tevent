// backend/models/AdminLog.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminLog extends Model {
    static associate(models) {
      AdminLog.belongsTo(models.User, { foreignKey: 'admin_id' });
    }
  }

  AdminLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    target_type: {
      type: DataTypes.STRING, // 'guild', 'user', 'subscription', etc.
      allowNull: true
    },
    target_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AdminLog',
    tableName: 'admin_logs',
    underscored: true,
    timestamps: true
  });

  return AdminLog;
};