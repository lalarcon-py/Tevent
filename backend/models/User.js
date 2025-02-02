const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  discord_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Member'
  },
  status: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Active'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  builds: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: false,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('builds');
      return Array.isArray(rawValue) ? rawValue : [];
    },
    set(value) {
      this.setDataValue('builds', Array.isArray(value) ? value : []);
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW')
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: sequelize.fn('NOW')
  }
}, {
  tableName: 'users',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (instance) => {
      instance.updated_at = new Date();
    }
  }
});

module.exports = User;