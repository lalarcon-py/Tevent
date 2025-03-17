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

      // Step 1: First handle duplicates from the existing database
      console.log('Checking for duplicates in the database...');
      const findDuplicatesQuery = `
        SELECT name, array_agg(id ORDER BY created_at) as ids
        FROM items
        GROUP BY name
        HAVING COUNT(*) > 1;
      `;
      
      const duplicateGroups = await queryInterface.sequelize.query(
        findDuplicatesQuery,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Found ${duplicateGroups.length} item names with duplicates in database`);
      
      // For each group of duplicates, keep only the first one (oldest by created_at)
      // and update foreign key references to point to it
      let updatedCount = 0;
      let deletedCount = 0;
      
      for (const group of duplicateGroups) {
        const [primaryId, ...duplicateIds] = group.ids;
        
        if (duplicateIds.length > 0) {
          console.log(`Processing duplicates for ${group.name}: keeping ${primaryId}, redirecting ${duplicateIds.length} duplicates`);
          
          for (const duplicateId of duplicateIds) {
            // Update any references in guild_storage_items table
            try {
              const updateQuery = `
                UPDATE guild_storage_items 
                SET item_id = :primaryId 
                WHERE item_id = :duplicateId
              `;
              
              const result = await queryInterface.sequelize.query(updateQuery, {
                replacements: { primaryId, duplicateId },
                type: queryInterface.sequelize.QueryTypes.UPDATE
              });
              
              updatedCount += result[1]; // Get number of affected rows
              
              // Now try to delete the duplicate
              await queryInterface.sequelize.query(
                `DELETE FROM items WHERE id = :duplicateId`,
                {
                  replacements: { duplicateId },
                  type: queryInterface.sequelize.QueryTypes.DELETE
                }
              );
              
              deletedCount++;
              
            } catch (error) {
              console.error(`Failed to process duplicate ${duplicateId}:`, error.message);
              // Continue with other duplicates even if this one fails
            }
          }
        }
      }
      
      console.log(`Updated ${updatedCount} references and removed ${deletedCount} duplicate items`);

      // Step 2: Get remaining unique items in the database
      const existingItems = await queryInterface.sequelize.query(
        `SELECT name FROM items`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const existingItemNames = new Set(existingItems.map(item => item.name));
      console.log(`Found ${existingItemNames.size} unique existing items in the database`);

      // Step 3: Process items from JSON, avoiding duplicates
      const seenItems = new Set();
      const transformedItems = [];
      
      for (const item of items) {
        // Skip if already in database
        if (existingItemNames.has(item.name)) {
          continue;
        }
        
        // Skip duplicates within the JSON file
        if (seenItems.has(item.name)) {
          continue;
        }
        
        seenItems.add(item.name);
        
        transformedItems.push({
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
        });
      }

      console.log(`🌱 Inserting ${transformedItems.length} unique items`);
      
      if (transformedItems.length > 0) {
        await queryInterface.bulkInsert('items', transformedItems, {});
      }
      
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