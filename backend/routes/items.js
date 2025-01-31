const express = require('express');
const router = express.Router();
const { Item } = require('../models');
const { isOfficer } = require('../middleware/auth');
const { Op } = require('sequelize');
const { updateItem } = require('../controllers/itemsController');
const { getAutocompleteItems } = require('../controllers/itemsController');

// Fetch all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.findAll();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Update item (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dkpCost, inStorage, quantity, icon } = req.body;

    // Basic validation
    if (dkpCost !== undefined && typeof dkpCost !== 'number') {
      return res.status(400).json({ error: 'Invalid dkpCost value' });
    }
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
      return res.status(400).json({ error: 'Invalid quantity value' });
    }

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await item.update({ dkpCost, inStorage, quantity, icon });
    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Search items
router.get('/search', async (req, res) => {
  try {
    const hardcodedQuery = 'Ebon Roar Greaves'; // Replace with a known value in your database

    const items = await Item.findAll({
      where: {
        name: {
          [Op.iLike]: `%${hardcodedQuery}%`
        }
      },
      limit: 10
    });

    console.log('Search results:', JSON.stringify(items, null, 2));
    res.json(items);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Add new item
router.post('/', async (req, res) => {
  try {
    const { name, type, dkpCost, quantity, inStorage, icon } = req.body;
    
    // Create the new item
    const newItem = await Item.create({
      name,
      type,
      dkpCost,
      quantity,
      inStorage,
      icon
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByPk(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.destroy();
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Autocomplete items
router.get('/autocomplete', getAutocompleteItems, async (req, res) => {
  try {
    const items = await Item.findAll({
      attributes: ['id', 'name', 'icon'],
      order: [['name', 'ASC']]
    });
    console.log('Autocomplete query:', Item.findAll({ attributes: ['id', 'name', 'icon'], order: [['name', 'ASC']] }).toString());
    console.log('Autocomplete results:', JSON.stringify(items, null, 2)); // Log the results
    res.json(items);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;