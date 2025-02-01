const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MemberBuild = sequelize.define('memberbuilds', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  primary_weapon: {
    type: DataTypes.STRING,
    allowNull: false
  },
  secondary_weapon: {
    type: DataTypes.STRING,
    allowNull: false
  },
  combat_role: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'memberbuilds'
});

module.exports = MemberBuild;