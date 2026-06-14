// migrations/XXXXXX-add-selected-build-to-event-participants.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('event_participants', 'selected_build', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Stores the build data selected at signup'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('event_participants', 'selected_build');
  }
};