// backend/migrations/2025-02-26-add-guild-invite-system.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Guild Invites table
    await queryInterface.createTable('guild_invites', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      guild_id: {
        type: Sequelize.UUID,
        references: {
          model: 'guilds',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      use_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Add status and deletion fields to guilds
    await queryInterface.addColumn('guilds', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'ACTIVE'
    });

    await queryInterface.addColumn('guilds', 'deletion_scheduled_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add additional fields to guild_members
    await queryInterface.addColumn('guild_members', 'joined_via_invite', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('guild_members', 'invited_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('guild_invites');
    await queryInterface.removeColumn('guilds', 'status');
    await queryInterface.removeColumn('guilds', 'deletion_scheduled_at');
    await queryInterface.removeColumn('guild_members', 'joined_via_invite');
    await queryInterface.removeColumn('guild_members', 'invited_by');
  }
};