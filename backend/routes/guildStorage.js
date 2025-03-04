// backend/routes/guildStorage.js
const express = require('express');
const router = express.Router();
const models = require('../models'); // Ensure this points to your models index.js

// Get all items in guild storage
router.get('/items', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Require guild ID
    const guildId = req.query.guildId || req.params.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const storageItems = await models.GuildStorageItem.findAll({
      include: [{
        model: models.Item,
        attributes: ['name', 'type', 'icon']
      }]
    });
    
    res.json(storageItems);
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({ error: 'Failed to fetch storage items', details: error.message });
  }
});

// Add an item to guild storage
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { item_id, quantity, dkp_cost, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log('Adding item to storage:', { item_id, quantity, dkp_cost });
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    // Check if item exists
    const item = await models.Item.findByPk(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Create or update storage item
    const [storageItem, created] = await models.GuildStorageItem.findOrCreate({
      where: { item_id },
      defaults: {
        quantity: quantity || 1,
        dkp_cost: dkp_cost || 0,
        trait: null
      }
    });

    if (!created) {
      // If item already exists, update its quantity
      storageItem.quantity = (storageItem.quantity || 0) + (quantity || 1);
      await storageItem.save();
    }

    // Get the full item with its associations
    const fullItem = await models.GuildStorageItem.findByPk(storageItem.id, {
      include: [models.Item]
    });

    res.status(created ? 201 : 200).json(fullItem);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage', details: error.message });
  }
});

// Update guild storage item
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { quantity, dkp_cost, trait, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const storageItem = await models.GuildStorageItem.findByPk(id);
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Update fields if provided
    if (quantity !== undefined) storageItem.quantity = quantity;
    if (dkp_cost !== undefined) storageItem.dkp_cost = dkp_cost;
    if (trait !== undefined) storageItem.trait = trait;
    
    await storageItem.save();
    
    // Get the full item with its associations
    const fullItem = await models.GuildStorageItem.findByPk(id, {
      include: [models.Item]
    });
    
    res.json(fullItem);
  } catch (error) {
    console.error('Error updating storage item:', error);
    res.status(500).json({ error: 'Failed to update storage item', details: error.message });
  }
});
// Delete guild storage item
router.delete('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const guildId = req.query.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // First, delete any associated loot requests
    await models.LootRequest.destroy({
      where: { storage_item_id: id }
    });
    
    // Then delete the storage item
    const result = await models.GuildStorageItem.destroy({
      where: { id }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    res.json({ message: 'Storage item deleted successfully' });
  } catch (error) {
    console.error('Error deleting storage item:', error);
    res.status(500).json({ error: 'Failed to delete storage item', details: error.message });
  }
});

module.exports = router;