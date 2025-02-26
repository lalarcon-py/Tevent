// backend/models/Guild.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Guild extends Model {
    static associate(models) {
      Guild.hasMany(models.GuildMember, { foreignKey: 'guild_id' });
    }
  }

  Guild.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 50]
      }
    },
    owner_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE'
    },
    deletion_scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Guild',
    tableName: 'guilds',
    underscored: true,
    timestamps: true
  });

  return Guild;
};