'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns with the expanded ENUM options
    await queryInterface.addColumn('loot_requests', 'need_or_greed', {
      type: Sequelize.ENUM('NEED_ITEM', 'NEED_TRAIT', 'GREED'),
      allowNull: false,
      defaultValue: 'NEED_ITEM'
    });

    await queryInterface.addColumn('loot_requests', 'request_time', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    await queryInterface.addColumn('loot_requests', 'expiration_time', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Update existing data - set all existing requests to NEED_ITEM
    try {
      await queryInterface.sequelize.query(`
        UPDATE loot_requests 
        SET need_or_greed = 'NEED_ITEM', 
            request_time = NOW(), 
            expiration_time = NOW() + INTERVAL '24 HOURS'
        WHERE status = 'Pending';
      `);
    } catch (error) {
      console.error('Error updating existing records:', error);
    }

    // Add an index for faster queries on expiration_time
    await queryInterface.addIndex('loot_requests', ['expiration_time'], {
      name: 'idx_loot_requests_expiration_time'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index
    await queryInterface.removeIndex('loot_requests', 'idx_loot_requests_expiration_time');

    // Remove the columns
    await queryInterface.removeColumn('loot_requests', 'expiration_time');
    await queryInterface.removeColumn('loot_requests', 'request_time');
    
    // Remove the enum type after removing the column
    await queryInterface.removeColumn('loot_requests', 'need_or_greed');
    
    // Remove the ENUM type (different in various DB systems)
    try {
      // PostgreSQL specific
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_loot_requests_need_or_greed";');
    } catch (error) {
      console.warn('Note: Could not drop ENUM type. This may be expected for non-PostgreSQL databases.');
    }
  }
};