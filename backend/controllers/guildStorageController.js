const db = require('../models');

// Get guild storage items
const getGuildStorageItems = async (req, res) => {
  try {
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    
    if (req.isAuthenticated()) {
      const isMember = await db.GuildMember.findOne({
        where: { guild_id: guildId, user_id: req.user.id }
      });
      
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this guild' });
      }
    } else {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Use guild ID to filter storage items
    const storageItems = await db.GuildStorageItem.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.Item,
        where: { guild_id: guildId },
        required: false
      }]
    });
    
    res.json(storageItems);
  } catch (error) {
    console.error('Error fetching guild storage items:', error);
    res.status(500).json({ error: 'Failed to fetch storage items' });
  }
};

// Add item to storage
const addItemToStorage = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { item_id, quantity, dkp_cost, trait } = req.body;
    const guildId = req.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Verify membership and role
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember) {
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Check if user has permission to add items (Guild Master or Guild Advisor only)
    if (!['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Check if the item exists in the guild's catalog
    const itemExists = await db.Item.findOne({
      where: {
        id: item_id,
        guild_id: guildId
      }
    });
    
    if (!itemExists) {
      return res.status(404).json({ error: 'Item not found in catalog for this guild' });
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
        trait: trait || null,
        dkp_cost: dkp_cost || 0
      });
    }
    
    // Return with item details
    const fullItem = await db.GuildStorageItem.findByPk(storageItem.id, {
      include: [{
        model: db.Item,
        where: { guild_id: guildId },
        required: false
      }]
    });
    
    res.status(201).json(fullItem);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage' });
  }
};

module.exports = {
  getGuildStorageItems,
  addItemToStorage
};