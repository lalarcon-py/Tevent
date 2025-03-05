// backend/models/GuildApplication.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GuildApplication extends Model {
    static associate(models) {
      GuildApplication.belongsTo(models.User, { foreignKey: 'user_id' });
      GuildApplication.belongsTo(models.Guild, { foreignKey: 'guild_id' });
    }
  }

  GuildApplication.init({
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    in_game_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    questlog_link: {
      type: DataTypes.STRING,
      allowNull: true
    },
    screenshot_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    previous_guilds: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    leave_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    combat_power: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED', 'WAITLISTED'),
      defaultValue: 'PENDING'
    },
    waitlisted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processed_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GuildApplication',
    tableName: 'guild_applications',
    underscored: true,
    timestamps: true,
    scopes: {
      forGuild(guildId) {
        return {
          where: { guild_id: guildId }
        };
      }
    }
  });

  return GuildApplication;
}