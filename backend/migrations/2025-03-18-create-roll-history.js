'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('roll_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      guild_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guilds',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      item_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      item_type: {
        type: Sequelize.STRING
      },
      item_icon: {
        type: Sequelize.STRING
      },
      item_trait: {
        type: Sequelize.STRING
      },
      winner_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      winner_name: {
        type: Sequelize.STRING
      },
      winner_roll: {
        type: Sequelize.INTEGER
      },
      winner_need_type: {
        type: Sequelize.STRING(50)
      },
      roll_results: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      roll_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Add indexes
    await queryInterface.addIndex('roll_history', ['guild_id']);
    await queryInterface.addIndex('roll_history', ['winner_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('roll_history');
  }
};