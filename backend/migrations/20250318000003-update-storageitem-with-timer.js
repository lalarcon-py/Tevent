'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guild_storage_items', 'timer_duration', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1440 // Default to 24 hours (in minutes)
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('guild_storage_items', 'timer_duration');
  }
};