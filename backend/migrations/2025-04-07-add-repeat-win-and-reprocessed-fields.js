'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('roll_history', 'is_repeated_win', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn('roll_history', 'previous_win_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('roll_history', 'reprocessed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn('roll_history', 'reprocessed_note', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('roll_history', 'is_repeated_win');
    await queryInterface.removeColumn('roll_history', 'previous_win_date');
    await queryInterface.removeColumn('roll_history', 'reprocessed');
    await queryInterface.removeColumn('roll_history', 'reprocessed_note');
  }
};