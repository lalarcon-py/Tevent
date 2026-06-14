'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create static_teams only if it doesn't already exist
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('static_teams')) {
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
    }

    if (!tables.includes('static_team_members')) {
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
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('static_team_members');
    await queryInterface.dropTable('static_teams');
  }
};
