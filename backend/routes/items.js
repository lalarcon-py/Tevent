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
    const { dkpCost, inStorage, quantity, icon, trait } = req.body; // Add trait

    if (dkpCost !== undefined && typeof dkpCost !== 'number') {
      return res.status(400).json({ error: 'Invalid dkpCost value' });
    }
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
      return res.status(400).json({ error: 'Invalid quantity value' });
    }

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await item.update({ dkpCost, inStorage, quantity, icon, trait }); // Add trait
    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Add this near the top with your other imports
const AVAILABLE_TRAITS = [
  "Bonus Damage",
  "Max Health",
  "Health Regen",
  "Skill Damage Resistance",
  "Debuff Duration",
  "Collision Resistance",
  "Silence Resistance"
];

// Get all available traits
router.get('/traits', async (req, res) => {
  try {
    const items = await Item.findAll({
      attributes: ['traits'],
      where: {
        traits: {
          [Op.not]: null
        }
      }
    });
    
    // Extract and flatten all traits from items, then remove duplicates
    const uniqueTraits = [...new Set(items.flatMap(item => item.traits))];
    res.json(uniqueTraits);
  } catch (error) {
    console.error('Error fetching traits:', error);
    res.status(500).json({ error: 'Failed to fetch traits' });
  }
});

// Get traits for a specific item
router.get('/:id/traits', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item.traits || []);
  } catch (error) {
    console.error('Error fetching item traits:', error);
    res.status(500).json({ error: 'Failed to fetch item traits' });
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
    const { name, dkpCost, quantity, trait } = req.body;
    
    const templateItem = await Item.findOne({
      where: { name: name }
    });

    if (!templateItem) {
      return res.status(400).json({ error: 'Item template not found' });
    }

    // Check if item exists in guild storage
    const existingStorageItem = await GuildStorageItem.findOne({
      where: { item_id: templateItem.id }
    });

    if (existingStorageItem) {
      const updatedItem = await existingStorageItem.update({
        quantity: existingStorageItem.quantity + quantity,
        trait,
        dkpCost
      });
      
      const fullItem = {
        ...updatedItem.toJSON(),
        name: templateItem.name,
        type: templateItem.type,
        icon: templateItem.icon
      };
      
      return res.json(fullItem);
    }

    const newStorageItem = await GuildStorageItem.create({
      item_id: templateItem.id,
      quantity,
      trait,
      dkpCost
    });

    const fullItem = {
      ...newStorageItem.toJSON(),
      name: templateItem.name,
      type: templateItem.type,
      icon: templateItem.icon
    };

    res.status(201).json(fullItem);
  } catch (error) {
    console.error('Error creating/updating storage item:', error);
    res.status(500).json({ error: 'Failed to create/update storage item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const storageItem = await GuildStorageItem.findByPk(id);
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
 
    await storageItem.destroy();
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
      attributes: ['id', 'name', 'icon', 'type'],  // Add type to attributes
      order: [['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;