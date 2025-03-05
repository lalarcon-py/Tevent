// backend/models/Guild.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Guild extends Model {
    static associate(models) {
      Guild.hasMany(models.GuildMember, { foreignKey: 'guild_id' });
      Guild.hasOne(models.GuildSettings, { foreignKey: 'guild_id' });
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
    },
    // New guild settings fields
    last_name_change: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dkp_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    max_tanks: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false
    },
    max_healers: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      allowNull: false
    },
    max_dps: {
      type: DataTypes.INTEGER,
      defaultValue: 75,
      allowNull: false
    },
    min_attendance_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      allowNull: false
    },
    attendance_warning_message: {
      type: DataTypes.TEXT,
      defaultValue: 'You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown.',
      allowNull: false
    },
    private_guild: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    auto_kick_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    attendance_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 40,
      allowNull: false
    },
    no_show_count: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false
    },
    gear_check_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    gear_check_frequency: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'Guild',
    tableName: 'guilds',
    underscored: true,
    timestamps: true
  });

  return Guild;
};