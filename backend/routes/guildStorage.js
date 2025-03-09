// backend/routes/guildStorage.js
const express = require('express');
const router = express.Router();
const db = require('../models');

// Get all items in guild storage
router.get('/items', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get guild ID from request
    const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Include guild_id in the query
    const storageItems = await db.GuildStorageItem.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.Item,
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

    const { item_id, quantity, dkp_cost, trait } = req.body;
    
    // Get guild ID from request using the middleware
    const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Verify user has permission to add items (Guild Master or Guild Advisor only)
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Check if item already exists in storage with the same trait
    const existingStorageItem = await db.GuildStorageItem.findOne({
      where: {
        guild_id: guildId,
        item_id: item_id,
        trait: trait || null
      }
    });
    
    let storageItem;
    
    if (existingStorageItem) {
      // Update existing item quantity
      const newQuantity = existingStorageItem.quantity + (quantity || 1);
      await existingStorageItem.update({
        quantity: newQuantity,
        dkp_cost: dkp_cost !== undefined ? dkp_cost : existingStorageItem.dkp_cost
      });
      storageItem = existingStorageItem;
    } else {
      // Create new storage item
      storageItem = await db.GuildStorageItem.create({
        guild_id: guildId,
        item_id: item_id,
        quantity: quantity || 1,
        dkp_cost: dkp_cost || 0,
        trait: trait || null
      });
    }

    // Get the full item with its associations
    const fullItem = await db.GuildStorageItem.findByPk(storageItem.id, {
      include: [db.Item]
    });

    res.status(201).json(fullItem);
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
    
    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { 
        guild_id: guildId || req.query.guildId, 
        user_id: req.user.id 
      }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const storageItem = await db.GuildStorageItem.findByPk(id);
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Update fields if provided with validation
    if (quantity !== undefined) {
      // Ensure quantity is not negative
      storageItem.quantity = Math.max(0, parseInt(quantity, 10));
    }
    
    if (dkp_cost !== undefined) storageItem.dkp_cost = dkp_cost;
    if (trait !== undefined) storageItem.trait = trait;
    
    await storageItem.save();
    
    // Get the full item with its associations
    const fullItem = await db.GuildStorageItem.findByPk(id, {
      include: [db.Item]
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
    await db.LootRequest.destroy({
      where: { storage_item_id: id }
    });
    
    // Then delete the storage item
    const result = await db.GuildStorageItem.destroy({
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