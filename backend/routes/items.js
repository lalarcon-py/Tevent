const express = require('express');
const router = express.Router();
const { Item } = require('../models');
const { Op } = require('sequelize');
const { updateItem } = require('../controllers/itemsController');
const { getAutocompleteItems } = require('../controllers/itemsController');

// Fetch all items
router.get('/', async (req, res) => {
  try {
    const guildId = req.query.guildId || req.params.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
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
    const { dkpCost, inStorage, quantity, icon, guildId } = req.body;

    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
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
    const guildId = req.query.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const searchQuery = req.query.q || 'Ebon Roar Greaves'; // Use query parameter with fallback

    const items = await Item.findAll({
      where: {
        name: {
          [Op.iLike]: `%${searchQuery}%`
        }
      },
      limit: 10
    });

    res.json(items);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Add new item
router.post('/', async (req, res) => {
  try {
    const { name, dkpCost, quantity, inStorage, icon, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // First, find the complete item information from the template/autocomplete items
    const templateItem = await Item.findOne({
      where: {
        name: name
      },
      attributes: ['id', 'name', 'type', 'icon'] // Get all necessary template fields
    });

    if (!templateItem) {
      return res.status(400).json({ error: 'Item template not found' });
    }

    // Now check if a storage entry exists for this item
    const existingStorageItem = await Item.findOne({
      where: {
        name: name,
        inStorage: true
      }
    });

    if (existingStorageItem) {
      // If item exists in storage, update its properties
      const updatedItem = await existingStorageItem.update({
        dkpCost: dkpCost || existingStorageItem.dkpCost,
        quantity: existingStorageItem.quantity + quantity,
        inStorage,
        icon: icon || templateItem.icon
      });
      return res.json(updatedItem);
    }

    // If item doesn't exist in storage, create new one with template data
    const newItem = await Item.create({
      name,
      type: templateItem.type, // Use type from template
      dkpCost,
      quantity,
      inStorage,
      icon: icon || templateItem.icon
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating/updating item:', error);
    res.status(500).json({ error: 'Failed to create/update item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const guildId = req.query.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
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
router.get('/autocomplete', async (req, res) => {
  try {
    const guildId = req.query.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const items = await Item.findAll({
      attributes: ['id', 'name', 'icon', 'type', 'traits'],  // Add traits to attributes
      order: [['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;