const express = require('express');
const router = express.Router();
const { GuildStorageItem, Item } = require('../models');
const databaseMiddleware = require('../middleware/databaseMiddleware');

// Apply database middleware to all routes
router.use(databaseMiddleware);

// Get all items in guild storage with their item details
router.get('/items', async (req, res) => {
  try {
    const storageItems = await GuildStorageItem.findAll({
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });
    res.json(storageItems);
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({ error: 'Failed to fetch storage items' });
  }
});

// Add an item to guild storage
router.post('/', async (req, res) => {
  try {
    if (!req.db) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const { item_id, quantity, dkp_cost } = req.body;

    const storageItem = await GuildStorageItem.create({
      item_id,
      quantity,
      dkp_cost
    }, {
      sequelize: req.db // Use the guild-specific database connection
    });

    const itemWithDetails = await GuildStorageItem.findByPk(storageItem.id, {
      include: [Item],
      sequelize: req.db
    });

    res.status(201).json(itemWithDetails);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage' });
  }
});

module.exports = router;