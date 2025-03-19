const db = require('../models');
const axios = require('axios');

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

const addItemToStorage = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Log the entire request body to debug
    console.log('⏰ FULL REQUEST BODY:', JSON.stringify(req.body));
    
    const { item_id, quantity, dkp_cost, trait, timerDuration } = req.body;
    const guildId = req.guildId || req.body.guildId;
    
    // Log the specific timer duration value extracted
    console.log('⏰ TIMER DURATION FROM REQUEST:', timerDuration, typeof timerDuration);
    
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
    
    // Force conversion to number for timer duration
    let parsedTimerDuration;
    if (timerDuration === undefined || timerDuration === null) {
      parsedTimerDuration = 1440; // Default to 24 hours
    } else {
      parsedTimerDuration = Number(timerDuration);
      if (isNaN(parsedTimerDuration)) {
        parsedTimerDuration = 1440; // Default to 24 hours if invalid
      }
    }
    
    // Validate timer duration
    const validDurations = [5, 60, 1440, 2880, 4320]; // minutes (5min, 1hr, 24hr, 48hr, 72hr)
    const validatedTimerDuration = validDurations.includes(parsedTimerDuration) 
      ? parsedTimerDuration 
      : 1440; // Default to 24 hours if not in valid list

    console.log('⏰ VALIDATED TIMER DURATION:', validatedTimerDuration);
    
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
      // Update existing item quantity and explicitly update timer_duration
      const newQuantity = existingStorageItem.quantity + (quantity || 1);
      
      // Use direct SQL to update existing item
      const updateQuery = `
        UPDATE guild_storage_items 
        SET quantity = ${newQuantity}, 
            dkp_cost = ${dkp_cost !== undefined ? dkp_cost : existingStorageItem.dkp_cost},
            timer_duration = ${validatedTimerDuration},
            updated_at = NOW()
        WHERE id = '${existingStorageItem.id}'
        RETURNING *`;
        
      console.log('⏰ UPDATE QUERY:', updateQuery);
      
      const [updateResult] = await db.sequelize.query(updateQuery);
      console.log('⏰ UPDATE RESULT:', JSON.stringify(updateResult[0]));
      
      // Refresh the storage item from the database
      storageItem = await db.GuildStorageItem.findByPk(existingStorageItem.id);
    } else {
      // Create new storage item with explicit timer_duration
      const insertQuery = `
        INSERT INTO guild_storage_items
        (id, guild_id, item_id, quantity, trait, dkp_cost, timer_duration, created_at, updated_at)
        VALUES
        (uuid_generate_v4(), '${guildId}', '${item_id}', ${quantity || 1}, ${trait ? `'${trait}'` : 'NULL'}, ${dkp_cost || 0}, ${validatedTimerDuration}, NOW(), NOW())
        RETURNING *`;
        
      console.log('⏰ INSERT QUERY:', insertQuery);
      
      const [insertResult] = await db.sequelize.query(insertQuery);
      console.log('⏰ INSERT RESULT:', JSON.stringify(insertResult[0]));
      
      // Get the inserted ID from the result
      const newItemId = insertResult[0].id;
      
      // Fetch the newly created item
      storageItem = await db.GuildStorageItem.findByPk(newItemId);
    }
    
    // Check what was actually stored
    console.log('⏰ STORED ITEM:', JSON.stringify(storageItem.dataValues));
    
    // Directly add timer_duration to response to ensure client receives it
    const response = {
      ...storageItem.dataValues,
      timer_duration: validatedTimerDuration, // Force this value to be correct
      Item: await db.Item.findByPk(item_id)
    };
    
    console.log('⏰ FINAL RESPONSE:', JSON.stringify(response));
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage', details: error.message });
  }
};

module.exports = {
  getGuildStorageItems,
  addItemToStorage
};