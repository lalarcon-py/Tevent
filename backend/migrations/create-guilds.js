// migrations/XXXXXX-create-guilds.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('guilds', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        owner_id: {
          type: Sequelize.STRING,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      });
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('guilds');
    }
  };
  
  // migrations/XXXXXX-create-guild-members.js
  module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('guild_members', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        guild_id: {
          type: Sequelize.UUID,
          references: {
            model: 'guilds',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.INTEGER,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        role: {
          type: Sequelize.STRING,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      });
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('guild_members');
    }
  };