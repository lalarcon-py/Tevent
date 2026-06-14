'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('guild_applications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      in_game_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      questlog_link: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      screenshot_url: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      previous_guilds: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      leave_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      combat_power: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'DENIED', 'WAITLISTED'),
        defaultValue: 'PENDING',
        allowNull: false
      },
      waitlisted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      processed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('guild_applications', ['guild_id']);
    await queryInterface.addIndex('guild_applications', ['user_id']);
    await queryInterface.addIndex('guild_applications', ['status']);
    await queryInterface.addIndex('guild_applications', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    // First drop indexes
    await queryInterface.removeIndex('guild_applications', ['guild_id']);
    await queryInterface.removeIndex('guild_applications', ['user_id']);
    await queryInterface.removeIndex('guild_applications', ['status']);
    await queryInterface.removeIndex('guild_applications', ['created_at']);
    
    // Then drop the ENUM type
    await queryInterface.dropTable('guild_applications');
    
    // Custom SQL to remove the ENUM type
    return queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_guild_applications_status";'
    );
  }
};