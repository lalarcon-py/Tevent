'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First check if table exists
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'item_message_tracking'
      )`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // If table doesn't exist, create it with all required columns
    if (!tableExists[0].exists) {
      console.log('Creating item_message_tracking table');
      await queryInterface.createTable('item_message_tracking', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        item_id: {
          type: Sequelize.UUID,
          allowNull: false
        },
        guild_id: {
          type: Sequelize.UUID,
          allowNull: false
        },
        channel_id: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        message_id: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        need_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        greed_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
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
      
      // Add unique constraint for item_id
      await queryInterface.addConstraint('item_message_tracking', {
        fields: ['item_id'],
        type: 'unique',
        name: 'unique_item_id'
      });
      
      return;
    }
    
    // Table exists, check if need_count column exists
    const needCountExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'item_message_tracking' AND column_name = 'need_count'
      )`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (!needCountExists[0].exists) {
      console.log('Adding need_count column to item_message_tracking');
      await queryInterface.addColumn('item_message_tracking', 'need_count', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    }
    
    // Check if greed_count column exists
    const greedCountExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'item_message_tracking' AND column_name = 'greed_count'
      )`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (!greedCountExists[0].exists) {
      console.log('Adding greed_count column to item_message_tracking');
      await queryInterface.addColumn('item_message_tracking', 'greed_count', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Try to remove the columns first
    try {
      await queryInterface.removeColumn('item_message_tracking', 'need_count');
      await queryInterface.removeColumn('item_message_tracking', 'greed_count');
    } catch (error) {
      console.log('Error removing columns:', error.message);
    }
    
    // Then try to drop the table
    try {
      await queryInterface.dropTable('item_message_tracking');
    } catch (error) {
      console.log('Error dropping table:', error.message);
    }
  }
};