'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('loot_requests', 'roll_value', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('loot_requests', 'roll_time', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('loot_requests', 'won_roll', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('loot_requests', 'roll_value');
    await queryInterface.removeColumn('loot_requests', 'roll_time');
    await queryInterface.removeColumn('loot_requests', 'won_roll');
  }
};