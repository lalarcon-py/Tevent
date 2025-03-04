// backend/models/GuildMember.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GuildMember extends Model {
    static associate(models) {
      GuildMember.belongsTo(models.Guild, { foreignKey: 'guild_id' });
      GuildMember.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  GuildMember.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    guild_id: {
      type: DataTypes.UUID,
      references: {
        model: 'guilds',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Guild Member'
    },
    joined_via_invite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    invited_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GuildMember',
    tableName: 'guild_members',
    underscored: true,
    timestamps: true
  });

  return GuildMember;
};