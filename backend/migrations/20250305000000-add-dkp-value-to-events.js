// 20250305000000-add-dkp-value-to-events.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('events', 'dkp_value', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'requirements' // Position after the requirements column
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('events', 'dkp_value');
  }
};