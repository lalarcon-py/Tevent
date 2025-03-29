'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the static_teams table
    await queryInterface.createTable('static_teams', {
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
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
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

    // Then create the static_team_members table
    await queryInterface.createTable('static_team_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'static_teams',
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
      guild_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guilds',
          key: 'id'
        }
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'DPS'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      selected_build: {
        type: Sequelize.JSONB,
        allowNull: true
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
  },

  down: async (queryInterface, Sequelize) => {
    // Drop in reverse order
    await queryInterface.dropTable('static_team_members');
    await queryInterface.dropTable('static_teams');
  }
};