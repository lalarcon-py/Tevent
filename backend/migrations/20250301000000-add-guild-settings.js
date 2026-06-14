// backend/migrations/2025-03-01-create-guild-settings.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('guild_settings', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      guild_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guilds',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      last_name_change: {
        type: Sequelize.DATE,
        allowNull: true
      },
      dkp_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      max_tanks: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        allowNull: false
      },
      max_healers: {
        type: Sequelize.INTEGER,
        defaultValue: 15,
        allowNull: false
      },
      max_dps: {
        type: Sequelize.INTEGER,
        defaultValue: 75,
        allowNull: false
      },
      min_attendance_threshold: {
        type: Sequelize.INTEGER,
        defaultValue: 60,
        allowNull: false
      },
      attendance_warning_message: {
        type: Sequelize.TEXT,
        defaultValue: 'You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown.',
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('guild_settings');
  }
};