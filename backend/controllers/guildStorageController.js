const db = require('../models');

// Get guild storage items
const getGuildStorageItems = async (req, res) => {
  try {
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log(`Fetching storage items for guild: ${guildId}`);
    
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
        model: db.Item
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
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    console.log(`Adding item ${item_id} to storage for guild: ${guildId}`);
    
    // Verify membership
    const isMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Verify the item exists in public catalog
    const itemExists = await db.Item.findByPk(item_id);
    
    if (!itemExists) {
      return res.status(404).json({ error: 'Item not found in catalog' });
    }
    
    // Create storage item
    const storageItem = await db.GuildStorageItem.create({
      guild_id: guildId,
      item_id: item_id,
      quantity: quantity || 1,
      trait: trait || null,
      dkp_cost: dkp_cost || 0
    });
    
    // Return with item details
    const fullItem = await db.GuildStorageItem.findByPk(storageItem.id, {
      include: [db.Item]
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