'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('events', 'timezone', {
      type: Sequelize.STRING,
      defaultValue: 'America/New_York',
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('events', 'timezone');
  }
};
