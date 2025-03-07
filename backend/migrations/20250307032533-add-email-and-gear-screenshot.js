'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('users', 'email', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    } catch (e) {
      console.log('Email column may already exist:', e.message);
    }
    
    try {
      await queryInterface.addColumn('users', 'gear_screenshot_url', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    } catch (e) {
      console.log('gear_screenshot_url column may already exist:', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('users', 'email');
    } catch (e) {
      console.log('Error removing email column:', e.message);
    }

    try {
      await queryInterface.removeColumn('users', 'gear_screenshot_url');
    } catch (e) {
      console.log('Error removing gear_screenshot_url column:', e.message);
    }
  }
};