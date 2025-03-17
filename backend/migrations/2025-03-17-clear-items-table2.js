'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Starting migration to clear all items...');
      
      // 1. First delete loot_requests that reference guild_storage_items
      console.log('Deleting loot requests...');
      await queryInterface.sequelize.query(
        'DELETE FROM loot_requests',
        { type: Sequelize.QueryTypes.DELETE, transaction }
      );
      
      // 2. Delete guild_storage_items that reference items
      console.log('Deleting guild storage items...');
      await queryInterface.sequelize.query(
        'DELETE FROM guild_storage_items',
        { type: Sequelize.QueryTypes.DELETE, transaction }
      );
      
      // 3. Delete wishlists that reference items
      console.log('Deleting wishlists...');
      await queryInterface.sequelize.query(
        'DELETE FROM wishlists',
        { type: Sequelize.QueryTypes.DELETE, transaction }
      );
      
      // 4. Now it's safe to delete all items
      console.log('Deleting all items...');
      await queryInterface.sequelize.query(
        'DELETE FROM items',
        { type: Sequelize.QueryTypes.DELETE, transaction }
      );
      
      console.log('All items and related data have been removed');
      
      await transaction.commit();
      console.log('Database is now ready for fresh seeding');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('This migration cannot be safely reverted as it deletes data');
  }
};