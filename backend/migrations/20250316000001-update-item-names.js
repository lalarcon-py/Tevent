// migrations/YYYYMMDDHHMMSS-update-item-names.js
'use strict';
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting item database update migration...');
    
    try {
      // Load scraped items
      const scrapedData = await fs.readFile(
        path.join(__dirname, '../tnl_filtered_items.json'),
        'utf-8'
      );
      const scrapedItems = JSON.parse(scrapedData);
      console.log(`📋 Found ${scrapedItems.length} items from scraper`);
      
      // Get existing items using raw SQL
      const existingItems = await queryInterface.sequelize.query(
        'SELECT id, name, icon, type FROM items',
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`🗄️ Found ${existingItems.length} items in database`);
      
      // Create lookup maps
      const itemsByIcon = {};
      const itemsByName = {};
      existingItems.forEach(item => {
        itemsByIcon[item.icon] = item;
        itemsByName[item.name] = item;
      });
      
      let updatedCount = 0;
      let newCount = 0;
      
      // Process in transaction
      await queryInterface.sequelize.transaction(async (transaction) => {
        for (const scrapedItem of scrapedItems) {
          // Check if item exists by icon
          const existingItem = itemsByIcon[scrapedItem.icon];
          
          if (existingItem) {
            // Update name if changed
            if (existingItem.name !== scrapedItem.name) {
              console.log(`📝 Updating: "${existingItem.name}" → "${scrapedItem.name}"`);
              await queryInterface.sequelize.query(
                'UPDATE items SET name = ?, updated_at = NOW() WHERE id = ?',
                {
                  replacements: [scrapedItem.name, existingItem.id],
                  transaction
                }
              );
              updatedCount++;
            }
          } else if (!itemsByName[scrapedItem.name]) {
            // Add new item
            console.log(`➕ Adding new item: "${scrapedItem.name}"`);
            await queryInterface.sequelize.query(
              `INSERT INTO items (
                id, name, type, dkp_cost, in_storage, quantity, icon, created_at, updated_at
              ) VALUES (
                uuid_generate_v4(), ?, ?, ?, false, 0, ?, NOW(), NOW()
              )`,
              {
                replacements: [
                  scrapedItem.name,
                  scrapedItem.type,
                  scrapedItem.dkp_value || 0,
                  scrapedItem.icon
                ],
                transaction
              }
            );
            newCount++;
          }
        }
      });
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - ${updatedCount} items renamed`);
      console.log(`   - ${newCount} new items added`);
      
    } catch (error) {
      console.error('❌ Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️ This migration cannot be undone automatically');
    return Promise.resolve();
  }
};