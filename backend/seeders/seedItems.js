const { Item } = require('./models');
const items = require('./tnl_filtered_items.json');

const seedItems = async () => {
  try {
    for (const item of items) {
      await Item.upsert({
        name: item.name,
        type: item.type,
        dkpCost: item.dkp_value,
        icon: item.icon,
        inStorage: false,
        quantity: 0
      });
    }
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};