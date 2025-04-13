'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guild_members', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    // Add index to improve performance on queries that filter by deleted_at
    await queryInterface.addIndex('guild_members', ['deleted_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('guild_members', ['deleted_at']);
    await queryInterface.removeColumn('guild_members', 'deleted_at');
  }
};
