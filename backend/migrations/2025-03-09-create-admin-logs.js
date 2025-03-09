// Migration for admin_logs table
module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('admin_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        admin_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        action: {
          type: Sequelize.STRING,
          allowNull: false
        },
        details: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        target_type: {
          type: Sequelize.STRING,
          allowNull: true
        },
        target_id: {
          type: Sequelize.UUID,
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
    down: async (queryInterface) => {
      await queryInterface.dropTable('admin_logs');
    }
  };