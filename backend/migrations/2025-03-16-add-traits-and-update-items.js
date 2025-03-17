'use strict';
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting item database update migration...');
    
    try {
      // Load scraped items data
      console.log('📂 Loading scraped item data...');
      const scrapedData = await fs.readFile(
        path.join(__dirname, '../tnl_filtered_items.json'),
        'utf-8'
      );
      const scrapedItems = JSON.parse(scrapedData);
      console.log(`📋 Found ${scrapedItems.length} items from scraper`);
      
      // Get existing items from database
      console.log('🗃️ Fetching existing items from database...');
      const existingItems = await queryInterface.sequelize.query(
        'SELECT id, name, icon, type, traits FROM items',
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`🗄️ Found ${existingItems.length} items in database`);
      
      // Create lookup maps for efficient comparison
      const itemsByIcon = {};
      const itemsByName = {};
      existingItems.forEach(item => {
        itemsByIcon[item.icon] = item;
        itemsByName[item.name] = item;
      });
      
      // Track statistics
      let updatedNameCount = 0;
      let updatedTraitsCount = 0;
      let newCount = 0;
      
      // Process in transaction
      await queryInterface.sequelize.transaction(async (transaction) => {
        for (const scrapedItem of scrapedItems) {
          // Skip items with no icon (likely not properly scraped)
          if (!scrapedItem.icon) continue;
          
          // Check if item exists by icon (most reliable match)
          const existingItem = itemsByIcon[scrapedItem.icon];
          
          if (existingItem) {
            // Prepare for potential updates
            let updateSQL = [];
            let replacements = [];
            
            // Check if name has changed
            if (existingItem.name !== scrapedItem.name) {
              updateSQL.push('name = ?');
              replacements.push(scrapedItem.name);
              updatedNameCount++;
              console.log(`📝 Updating name: "${existingItem.name}" → "${scrapedItem.name}"`);
            }
            
            // Check if traits have changed or need to be added
            const newTraits = scrapedItem.traits || [];
            const currentTraits = existingItem.traits || [];
            
            // Check if arrays differ (contents or length)
            const traitsChanged = 
              !currentTraits || 
              newTraits.length !== currentTraits.length || 
              newTraits.some(trait => !currentTraits.includes(trait));
            
            if (traitsChanged && newTraits.length > 0) {
              // Build PostgreSQL array literal
              const pgArrayLiteral = buildPgArrayLiteral(newTraits);
              updateSQL.push(`traits = ${pgArrayLiteral}`);
              updatedTraitsCount++;
              console.log(`🏷️ Updating traits for "${scrapedItem.name}": ${newTraits.length} traits`);
            }
            
            // Only update if something has changed
            if (updateSQL.length > 0) {
              updateSQL.push('updated_at = NOW()');
              
              await queryInterface.sequelize.query(
                `UPDATE items SET ${updateSQL.join(', ')} WHERE id = ?`,
                {
                  replacements: [...replacements, existingItem.id],
                  transaction
                }
              );
            }
          } else if (!itemsByName[scrapedItem.name]) {
            // This is a new item that doesn't exist in the database
            console.log(`➕ Adding new item: "${scrapedItem.name}"`);
            
            // Prepare traits array literal
            const pgArrayLiteral = buildPgArrayLiteral(scrapedItem.traits || []);
            
            await queryInterface.sequelize.query(
              `INSERT INTO items (
                id, name, type, "dkpCost", "inStorage", quantity, icon, traits, created_at, updated_at
              ) VALUES (
                uuid_generate_v4(), ?, ?, ?, false, 0, ?, ${pgArrayLiteral}, NOW(), NOW()
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
      
      // Print summary
      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - ${updatedNameCount} items renamed`);
      console.log(`   - ${updatedTraitsCount} items with updated traits`);
      console.log(`   - ${newCount} new items added`);
      
    } catch (error) {
      console.error('❌ Error in migration:', error.message);
      if (error.sql) {
        console.error('SQL:', error.sql);
      }
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️ This migration cannot be undone as it updates item data');
    return Promise.resolve();
  }
};

// Helper function to build PostgreSQL array literal from JavaScript array
function buildPgArrayLiteral(array) {
  if (!array || array.length === 0) {
    return "ARRAY[]::varchar[]";
  }
  
  // Properly escape each value and format as PG array
  const escapedValues = array.map(value => {
    // Double up single quotes for PostgreSQL string literals and remove non-trait values
    if (typeof value !== 'string' || value.includes('font-size')) {
      return null;
    }
    const escapedValue = value.replace(/'/g, "''");
    return `'${escapedValue}'`;
  }).filter(Boolean); // Remove nulls
  
  if (escapedValues.length === 0) {
    return "ARRAY[]::varchar[]";
  }
  
  return `ARRAY[${escapedValues.join(', ')}]::varchar[]`;
}