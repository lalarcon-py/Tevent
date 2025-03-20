// migrations/[timestamp]-add-selected-build-to-event-participants.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('event_participants', 'selected_build', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('event_participants', 'selected_build');
  }
};