const { sequelize, Item } = require('../models');
const fs = require('fs').promises;
const path = require('path');

const seed = async () => {
    try {
        // Read the JSON file
        const jsonData = await fs.readFile(
            path.join(__dirname, '../tnl_filtered_items.json'),
            'utf-8'
        );
        const items = JSON.parse(jsonData);
        
        console.log('📖 Read items from JSON:', items.length); // Log number of items read

        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        await sequelize.sync({ force: true });
        console.log('🔄 Tables created');


        const transformedItems = items.map(item => ({
            name: item.name,
            type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
            dkpCost: item.dkp_value,
            icon: item.icon,
            inStorage: false,
            quantity: 0
        }));

        console.log('🔄 First item to be inserted:', transformedItems[0]); // Log first item

        const createdItems = await Item.bulkCreate(transformedItems);
        console.log(`🌱 Seeded ${createdItems.length} items`);

        // Verify items were created
        const count = await Item.count();
        console.log('📊 Number of items in database:', count);
        
        // Get and log first item from database
        const firstItem = await Item.findOne();
        console.log('📝 First item in database:', firstItem?.toJSON());

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();