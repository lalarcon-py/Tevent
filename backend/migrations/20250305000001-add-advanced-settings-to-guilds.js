'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guilds', 'private_guild', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    await queryInterface.addColumn('guilds', 'auto_kick_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    await queryInterface.addColumn('guilds', 'attendance_threshold', {
      type: Sequelize.INTEGER,
      defaultValue: 40,
      allowNull: false
    });
    
    await queryInterface.addColumn('guilds', 'no_show_count', {
      type: Sequelize.INTEGER,
      defaultValue: 3,
      allowNull: false
    });
    
    await queryInterface.addColumn('guilds', 'gear_check_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    await queryInterface.addColumn('guilds', 'gear_check_frequency', {
      type: Sequelize.INTEGER,
      defaultValue: 30,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('guilds', 'private_guild');
    await queryInterface.removeColumn('guilds', 'auto_kick_enabled');
    await queryInterface.removeColumn('guilds', 'attendance_threshold');
    await queryInterface.removeColumn('guilds', 'no_show_count');
    await queryInterface.removeColumn('guilds', 'gear_check_enabled');
    await queryInterface.removeColumn('guilds', 'gear_check_frequency');
  }
};