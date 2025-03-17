'use strict';
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting fresh items seeding process...');
      
      // Read the JSON file
      const jsonData = await fs.readFile(
        path.join(__dirname, '../tnl_filtered_items.json'),
        'utf-8'
      );
      const items = JSON.parse(jsonData);
      
      console.log(`📖 Read ${items.length} items from JSON`);

      // Format traits for PostgreSQL array type
      function formatTraitsForPostgres(traits) {
        if (!traits || !Array.isArray(traits) || traits.length === 0) {
          return '{}';
        }
        
        // Escape single quotes and properly format the array
        const escapedTraits = traits.map(trait => 
          trait.replace(/'/g, "''") // Escape single quotes in PostgreSQL
        );
        
        return `{${escapedTraits.map(t => `"${t}"`).join(',')}}`;
      }

      // Transform items for insertion
      const transformedItems = items.map(item => ({
        id: Sequelize.fn('gen_random_uuid'),  // Generate new UUIDs
        name: item.name,
        type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        dkp_cost: item.dkp_value,
        icon: item.icon,
        in_storage: false,
        quantity: 0,
        traits: formatTraitsForPostgres(item.traits),  // Properly formatted for PostgreSQL
        created_at: new Date(),
        updated_at: new Date()
      }));

      console.log(`Sample trait from first item: ${JSON.stringify(items[0].traits)}`);
      console.log(`Formatted for Postgres: ${transformedItems[0].traits}`);
      
      console.log(`🌱 Inserting ${transformedItems.length} items into clean database`);
      await queryInterface.bulkInsert('items', transformedItems, {});
      
      console.log('✅ Seeding completed successfully');

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('items', null, {});
  }
};