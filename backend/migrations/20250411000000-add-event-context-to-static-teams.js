'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the table exists
      const tableExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('static_teams'));
      
      if (!tableExists) {
        console.log('static_teams table does not exist, skipping migration');
        return;
      }
      
      // Check if the column already exists to avoid errors
      const tableInfo = await queryInterface.describeTable('static_teams');
      if (!tableInfo.event_context) {
        console.log('Adding event_context column to static_teams table');
        await queryInterface.addColumn('static_teams', 'event_context', {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'Main Event'
        });
        console.log('Added event_context column successfully');
      } else {
        console.log('event_context column already exists, skipping');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the table exists
      const tableExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('static_teams'));
      
      if (!tableExists) {
        console.log('static_teams table does not exist, skipping rollback');
        return;
      }
      
      // Check if the column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('static_teams');
      if (tableInfo.event_context) {
        console.log('Removing event_context column from static_teams table');
        await queryInterface.removeColumn('static_teams', 'event_context');
        console.log('Removed event_context column successfully');
      } else {
        console.log('event_context column does not exist, skipping rollback');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};