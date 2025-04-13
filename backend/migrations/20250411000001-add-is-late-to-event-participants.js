'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add is_late field to event_participants table
    await queryInterface.addColumn('event_participants', 'is_late', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Add notes field to event_participants table for late arrival notes
    await queryInterface.addColumn('event_participants', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('event_participants', 'is_late');
    await queryInterface.removeColumn('event_participants', 'notes');
  }
};
