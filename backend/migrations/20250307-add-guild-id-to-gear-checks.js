'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists first to avoid errors
    try {
      const tableInfo = await queryInterface.describeTable('gear_checks');
      
      if (!tableInfo.guild_id) {
        await queryInterface.addColumn('gear_checks', 'guild_id', {
          type: Sequelize.UUID,
          allowNull: true,  // Make nullable to add to existing records
          references: {
            model: 'guilds',
            key: 'id'
          },
          onDelete: 'CASCADE'
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('gear_checks', 'guild_id');
  }
};