'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('event_absentees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      guild_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guilds',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('event_absentees', ['event_id']);
    await queryInterface.addIndex('event_absentees', ['user_id']);
    await queryInterface.addIndex('event_absentees', ['guild_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('event_absentees');
  }
};