'use strict';
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if items already exist
      const existingItems = await queryInterface.sequelize.query(
        'SELECT COUNT(*) FROM items',
        { type: Sequelize.QueryTypes.SELECT }
      );

      // If items exist, skip seeding
      if (existingItems[0].count > 0) {
        console.log('📝 Items table already has data, skipping seed');
        return;
      }

      // Read the JSON file
      const jsonData = await fs.readFile(
        path.join(__dirname, '../tnl_filtered_items.json'),
        'utf-8'
      );
      const items = JSON.parse(jsonData);
      
      console.log('📖 Read items from JSON:', items.length);

      const transformedItems = items.map(item => ({
        name: item.name,
        type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        dkp_cost: item.dkp_value,
        icon: item.icon,
        in_storage: false,
        quantity: 0,
        created_at: new Date(),
        updated_at: new Date()
      }));

      console.log('🔄 First item to be inserted:', transformedItems[0]);

      await queryInterface.bulkInsert('items', transformedItems, {});
      console.log(`🌱 Seeded ${transformedItems.length} items`);

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('items', null, {});
  }
};