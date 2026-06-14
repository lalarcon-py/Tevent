const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable UUID extension if not already enabled
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    // Create static_team_presets table
    await queryInterface.createTable('static_team_presets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add index for guild_id
    await queryInterface.addIndex('static_team_presets', ['guild_id']);

    // Add preset_id column to static_teams table
    await queryInterface.addColumn('static_teams', 'preset_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'static_team_presets',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Add index for preset_id
    await queryInterface.addIndex('static_teams', ['preset_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // We don't remove the UUID extension as other tables might be using it
    // Remove index for preset_id
    await queryInterface.removeIndex('static_teams', ['preset_id']);

    // Remove preset_id column from static_teams table
    await queryInterface.removeColumn('static_teams', 'preset_id');

    // Remove index for guild_id
    await queryInterface.removeIndex('static_team_presets', ['guild_id']);

    // Drop static_team_presets table
    await queryInterface.dropTable('static_team_presets');
  }
};
