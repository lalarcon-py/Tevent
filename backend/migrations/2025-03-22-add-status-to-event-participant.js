'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column already exists before adding it
    const tableInfo = await queryInterface.describeTable('event_participants');
    
    if (!tableInfo.status) {
      await queryInterface.addColumn('event_participants', 'status', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'CONFIRMED'
      });
      
      // Update existing data to make sure they're all marked as CONFIRMED
      await queryInterface.sequelize.query(`
        UPDATE event_participants SET status = 'CONFIRMED'
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if the column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('event_participants');
    
    if (tableInfo.status) {
      await queryInterface.removeColumn('event_participants', 'status');
    }
  }
};