'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('discord_data_cache', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      guild_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
    
    await queryInterface.addConstraint('discord_data_cache', {
      fields: ['guild_id', 'type'],
      type: 'unique',
      name: 'unique_guild_cache_type'
    });
    
    await queryInterface.addIndex('discord_data_cache', ['guild_id', 'type']);
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('discord_data_cache');
  }
};