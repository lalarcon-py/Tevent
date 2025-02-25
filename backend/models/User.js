'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.DKPTransaction);
      User.hasMany(models.LootRequest, { foreignKey: 'user_id', as: 'lootRequests' });
      // Add other associations here
    }
  }

  User.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    discord_id: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    avatar_url: { type: DataTypes.STRING },
    builds: { 
      type: DataTypes.JSONB,
      defaultValue: [] 
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    freezeTableName: true
  });

  return User;
};