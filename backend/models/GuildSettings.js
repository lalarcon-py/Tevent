// backend/models/GuildSettings.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GuildSettings extends Model {
    static associate(models) {
      GuildSettings.belongsTo(models.Guild, { foreignKey: 'guild_id' });
    }
  }

  GuildSettings.init({
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
      },
      onDelete: 'CASCADE'
    },
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
    }
  }, {
    sequelize,
    modelName: 'GuildSettings',
    tableName: 'guild_settings',
    underscored: true,
    timestamps: true
  });

  return GuildSettings;
};