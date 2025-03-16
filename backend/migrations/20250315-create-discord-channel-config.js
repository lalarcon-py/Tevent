// Create file at: backend/migrations/YYYYMMDDHHMMSS-create-discord-channel-config.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('discord_channel_configs', {
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
      discord_guild_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      channel_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      channel_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Add indexes
    await queryInterface.addIndex('discord_channel_configs', ['guild_id']);
    await queryInterface.addIndex('discord_channel_configs', ['discord_guild_id']);
    await queryInterface.addIndex('discord_channel_configs', ['channel_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('discord_channel_configs');
  }
};