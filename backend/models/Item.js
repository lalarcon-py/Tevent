const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rarity: {
    type: DataTypes.ENUM('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'), // Assuming these are the enum values
    allowNull: true,
  },
  dkpCost: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  inStorage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true,
  },
  traits: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'items',
  timestamps: true,
});

module.exports = Item;