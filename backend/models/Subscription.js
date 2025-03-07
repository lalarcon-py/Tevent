// backend/models/Subscription.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.Guild, { foreignKey: 'guild_id' });
    }
  }

  Subscription.init({
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
    plan_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    stripe_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_method_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    underscored: true,
    timestamps: true
  });

  return Subscription;
}