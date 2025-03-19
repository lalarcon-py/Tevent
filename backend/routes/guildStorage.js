// backend/routes/guildStorage.js
const express = require('express');
const router = express.Router();
const db = require('../models');

// Get all items in guild storage
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
    
    // Use direct SQL query to get everything including timer_duration
    const storageItems = await db.sequelize.query(
      `SELECT 
         gsi.id, gsi.guild_id, gsi.item_id, gsi.quantity, 
         gsi.trait, gsi.dkp_cost, 
         COALESCE(gsi.timer_duration, 1440) as timer_duration,
         gsi.created_at as "createdAt", gsi.updated_at as "updatedAt",
         i.name, i.type, i.icon, i.id as item_id
       FROM guild_storage_items gsi
       LEFT JOIN items i ON gsi.item_id = i.id
       WHERE gsi.guild_id = :guildId`,
      {
        replacements: { guildId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Format to expected structure
    const formattedItems = storageItems.map(item => ({
      id: item.id,
      guild_id: item.guild_id,
      item_id: item.item_id,
      quantity: item.quantity,
      trait: item.trait,
      dkp_cost: item.dkp_cost,
      timer_duration: parseInt(item.timer_duration) || 1440,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      Item: {
        id: item.item_id,
        name: item.name,
        type: item.type,
        icon: item.icon
      }
    }));
    
    console.log('Sending formatted items:', formattedItems);
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({ error: 'Failed to fetch storage items', details: error.message });
  }
});

// Add an item to guild storage
// In backend/routes/guildStorage.js (POST route)
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Extract timerDuration from the request body
    const { item_id, quantity, dkp_cost, trait, timerDuration } = req.body;
    
    console.log('⏰ Received timerDuration:', timerDuration, typeof timerDuration);
    
    const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Validate timer duration
    const validDurations = [5, 60, 1440, 2880, 4320]; // minutes (5min, 1hr, 24hr, 48hr, 72hr)
    const validatedDuration = timerDuration !== undefined && validDurations.includes(Number(timerDuration))
      ? Number(timerDuration)
      : 1440; // Default to 24 hours if invalid
    
    console.log('⏰ Using timer duration:', validatedDuration);
    
    // Calculate expiration time based on timer duration
    const now = new Date();
    const expirationTime = new Date(now.getTime() + (validatedDuration * 60000));
    
    console.log('⏰ Item will expire at:', expirationTime);
    
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
      
      // Update with timer_duration and expiration_time
      await existingStorageItem.update({
        quantity: newQuantity,
        dkp_cost: dkp_cost !== undefined ? dkp_cost : existingStorageItem.dkp_cost,
        timer_duration: validatedDuration,
        expiration_time: expirationTime,
        has_rolled: false // Reset roll status for the item
      });
      
      storageItem = existingStorageItem;
    } else {
      // Create new storage item WITH timer_duration and expiration_time
      storageItem = await db.GuildStorageItem.create({
        guild_id: guildId,
        item_id: item_id,
        quantity: quantity || 1,
        dkp_cost: dkp_cost || 0,
        trait: trait || null,
        timer_duration: validatedDuration,
        expiration_time: expirationTime,
        has_rolled: false
      });
      
      // Check wishlist and create automatic requests
      await checkWishlistAndCreateRequests(guildId, item_id, storageItem.id);
    }

    // Get the full item with its associations
    const fullItem = await db.GuildStorageItem.findByPk(storageItem.id, {
      include: [db.Item]
    });
    
    // Include timer_duration and expiration_time in response
    const response = {
      ...fullItem.toJSON(),
      timer_duration: validatedDuration,
      expiration_time: expirationTime
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage', details: error.message });
  }
});

// Helper function to check wishlists and create automatic requests
async function checkWishlistAndCreateRequests(guildId, itemId, storageItemId) {
  try {
    console.log(`Checking wishlist matches for item ${itemId} in guild ${guildId}`);
    
    // Get the storage item to access its timer_duration
    const storageItem = await db.GuildStorageItem.findByPk(storageItemId);
    if (!storageItem) {
      console.error(`Storage item ${storageItemId} not found`);
      return;
    }
    
    // Find all wishlist entries that match this item
    const wishlistMatches = await db.WishList.findAll({
      where: {
        guild_id: guildId,
        item_id: itemId
      },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'discord_id']
      }]
    });
    
    console.log(`Found ${wishlistMatches.length} wishlist matches for item ${itemId}`);
    
    // Get item details for notifications
    const itemDetails = await db.Item.findByPk(itemId);
    
    // Create requests for each matching wishlist entry
    for (const wishlistItem of wishlistMatches) {
      try {
        // Skip if user doesn't exist
        if (!wishlistItem.User) {
          console.warn(`User not found for wishlist item ${wishlistItem.id}`);
          continue;
        }
        
        // Check if user already has a pending request for this item
        const existingRequest = await db.LootRequest.findOne({
          where: {
            guild_id: guildId,
            storage_item_id: storageItemId,
            user_id: wishlistItem.user_id,
            status: 'Pending'
          }
        });
        
        if (!existingRequest) {
          // Calculate expiration time based on timer_duration
          const timerDuration = storageItem.timer_duration || 1440;
          const expirationTime = new Date(Date.now() + (timerDuration * 60000));
          
          // Create request with NEED_ITEM by default
          const newRequest = await db.LootRequest.create({
            guild_id: guildId,
            storage_item_id: storageItemId,
            user_id: wishlistItem.user_id,
            status: 'Pending',
            priority: wishlistItem.priority || 0,
            need_or_greed: 'NEED_ITEM',
            request_time: new Date(),
            expiration_time: expirationTime
          });
          
          console.log(`Created automatic request for user ${wishlistItem.User.username} based on wishlist`);
          console.log(`Request will expire at: ${expirationTime.toISOString()}`);
          
          // Notify Discord (if configured)
          try {
            const discordBotUrl = process.env.DISCORD_BOT_URL || "http://heartfelt-sparkle.railway.internal:3300";
            const axios = require('axios');
            
            await axios.post(`${discordBotUrl}/webhook/item-request`, {
              guildId: guildId,
              itemId: storageItemId,
              userId: wishlistItem.User.id,
              username: wishlistItem.User.username,
              itemName: itemDetails?.name || 'Unknown Item',
              isAutomatic: true,
              needOrGreed: 'NEED_ITEM',
              expirationTime: expirationTime.toISOString(),
              secret: process.env.BOT_WEBHOOK_SECRET
            });
          } catch (discordError) {
            console.warn('Failed to notify Discord:', discordError.message);
          }
        } else {
          console.log(`User ${wishlistItem.User.username} already has a pending request for this item`);
        }
      } catch (userError) {
        console.error(`Error creating auto-request for user ${wishlistItem.user_id}:`, userError);
      }
    }
  } catch (error) {
    console.error('Error processing wishlist auto-requests:', error);
  }
}

router.post('/debug/check-rolls', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const guildId = req.guildId || req.body.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Run the roll checker
    const rollScheduler = require('../utils/rollScheduler');
    const result = await rollScheduler.checkForExpiredRequests();
    
    res.json({ 
      success: true, 
      message: 'Roll check triggered successfully',
      processed: result 
    });
  } catch (error) {
    console.error('Debug roll check error:', error);
    res.status(500).json({ error: 'Failed to check rolls', details: error.message });
  }
});

// Debug route to manually trigger auto-requests for an item
router.post('/debug/check-wishlists/:itemId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { itemId } = req.params;
    const guildId = req.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get the storage item
    const storageItem = await db.GuildStorageItem.findOne({
      where: { item_id: itemId, guild_id: guildId }
    });
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Item not found in storage' });
    }
    
    // Run the wishlist checker
    await checkWishlistAndCreateRequests(guildId, itemId, storageItem.id);
    
    res.json({ 
      success: true, 
      message: 'Wishlist check triggered successfully for item ' + itemId
    });
  } catch (error) {
    console.error('Debug wishlist check error:', error);
    res.status(500).json({ error: 'Failed to check wishlists', details: error.message });
  }
});

// Update guild storage item
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    // Log what we received
    console.log('Update request body:', req.body);
    
    const { quantity, dkp_cost, trait, guildId, timer_duration } = req.body;
    
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
    console.log('Current storage item:', storageItem && storageItem.dataValues);
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Create an updates object to track changes
    const updates = {};
    
    // Update fields if provided with validation
    if (quantity !== undefined) {
      // Ensure quantity is not negative
      updates.quantity = Math.max(0, parseInt(quantity, 10));
    }
    
    if (dkp_cost !== undefined) updates.dkp_cost = dkp_cost;
    if (trait !== undefined) updates.trait = trait;
    
    // Handle timer_duration update - using direct SQL to ensure it works
    if (timer_duration !== undefined) {
      const validDurations = [5, 60, 1440, 2880, 4320]; // minutes (5min, 1hr, 24hr, 48hr, 72hr)
      const validatedDuration = validDurations.includes(Number(timer_duration)) 
        ? Number(timer_duration) 
        : 1440; // Default to 24 hours if invalid
      
      console.log(`Updating timer_duration to: ${validatedDuration}`);
      
      // Use direct SQL to ensure the update works regardless of Sequelize model
      await db.sequelize.query(
        `UPDATE guild_storage_items 
         SET timer_duration = :duration,
             updated_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            duration: validatedDuration,
            id: id
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
    }
    
    // Apply other updates using Sequelize
    if (Object.keys(updates).length > 0) {
      await storageItem.update(updates);
    }
    
    // Get the updated item with its associations
    // Use raw query to make sure we see all fields
    const [updatedItem] = await db.sequelize.query(
      `SELECT gsi.*, i.name, i.type, i.icon
       FROM guild_storage_items gsi
       LEFT JOIN items i ON gsi.item_id = i.id
       WHERE gsi.id = :id`,
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    console.log('Updated item:', updatedItem);
    
    // Create a response that includes all needed properties
    const response = {
      ...storageItem.dataValues,
      timer_duration: updatedItem.timer_duration || 1440,
      Item: {
        name: updatedItem.name,
        type: updatedItem.type,
        icon: updatedItem.icon
      }
    };
    
    res.json(response);
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

// Add this route at the end of the file
router.post('/setup-discord-channel', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, channelId, type } = req.body;
    
    if (!guildId || !channelId) {
      return res.status(400).json({ error: 'Guild ID and channel ID are required' });
    }
    
    // Check for existing configuration
    const existingConfig = await db.sequelize.query(
      `SELECT id FROM discord_channel_config 
       WHERE guild_id = ? AND channel_type = ?`, 
      { 
        replacements: [guildId, type || 'storage'],
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (existingConfig.length > 0) {
      // Update existing config
      await db.sequelize.query(
        `UPDATE discord_channel_config 
         SET channel_id = ?, enabled = true, updated_at = NOW()
         WHERE guild_id = ? AND channel_type = ?`,
        { 
          replacements: [channelId, guildId, type || 'storage'],
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
    } else {
      // Create table if doesn't exist
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS discord_channel_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          discord_guild_id VARCHAR(255),
          channel_id VARCHAR(255) NOT NULL,
          channel_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create new config
      await db.sequelize.query(
        `INSERT INTO discord_channel_config 
         (guild_id, channel_id, channel_type, enabled)
         VALUES (?, ?, ?, true)`,
        { 
          replacements: [guildId, channelId, type || 'storage'],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting up Discord channel:', error);
    res.status(500).json({ error: 'Failed to set up Discord channel' });
  }
});

router.post('/debug/force-roll/:storageItemId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { storageItemId } = req.params;
    const guildId = req.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { guild_id: guildId, user_id: req.user.id }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get the storage item to ensure it exists
    const storageItem = await db.GuildStorageItem.findOne({
      where: { id: storageItemId, guild_id: guildId },
      include: [{
        model: db.Item,
        attributes: ['name', 'icon']
      }]
    });
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Get all pending requests for this item
    const pendingRequests = await db.LootRequest.findAll({
      where: {
        guild_id: guildId,
        storage_item_id: storageItemId,
        status: 'Pending'
      },
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'username', 'discord_id', 'avatar_url']
      }]
    });
    
    if (pendingRequests.length === 0) {
      return res.status(404).json({ error: 'No pending requests found for this item' });
    }
    
    // Assign roll values to each request
    const rollResults = [];
    
    for (const request of pendingRequests) {
      // Generate random roll value 1-100
      const rollValue = Math.floor(Math.random() * 100) + 1;
      
      await request.update({
        roll_value: rollValue,
        roll_time: new Date()
      });
      
      rollResults.push({
        id: request.id,
        user_id: request.user_id,
        username: request.user ? request.user.username : 'Unknown',
        avatar_url: request.user ? request.user.avatar_url : null,
        discord_id: request.user ? request.user.discord_id : null,
        need_or_greed: request.need_or_greed,
        roll_value: rollValue
      });
    }
    
    // Sort rolls by priority: NEED_ITEM > NEED_TRAIT > GREED
    // Then by roll value (highest first)
    const priorityOrder = { 'NEED_ITEM': 0, 'NEED_TRAIT': 1, 'GREED': 2 };
    
    rollResults.sort((a, b) => {
      const priorityA = priorityOrder[a.need_or_greed] || 99;
      const priorityB = priorityOrder[b.need_or_greed] || 99;
      
      // First sort by need/greed priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by roll value (highest first)
      return b.roll_value - a.roll_value;
    });
    
    // Determine the winner (first item after sorting)
    const winner = rollResults.length > 0 ? rollResults[0] : null;
    
    // Update all requests with appropriate status
    for (const result of rollResults) {
      const isWinner = winner && result.id === winner.id;
      
      await db.LootRequest.update(
        {
          status: isWinner ? 'Approved' : 'Denied - Lost Roll',
          won_roll: isWinner
        },
        {
          where: { id: result.id }
        }
      );
      
      // Mark winner in the results
      if (isWinner) {
        result.winner = true;
      }
    }
    
    // If there's a winner, reduce item quantity
    if (winner) {
      if (storageItem.quantity > 0) {
        await storageItem.update({
          quantity: Math.max(0, storageItem.quantity - 1)
        });
      }
      
      // Attempt to notify Discord
      try {
        const discordBotUrl = process.env.DISCORD_BOT_URL || "http://heartfelt-sparkle.railway.internal:3300";
        const axios = require('axios');
        
        await axios.post(`${discordBotUrl}/webhook/roll-result`, {
          guildId: guildId,
          itemId: storageItemId,
          itemName: storageItem.Item ? storageItem.Item.name : 'Unknown Item',
          winnerId: winner.user_id,
          winnerName: winner.username,
          winnerDiscordId: winner.discord_id,
          rollValue: winner.roll_value,
          needOrGreed: winner.need_or_greed,
          allRolls: rollResults,
          secret: process.env.BOT_WEBHOOK_SECRET
        });
      } catch (discordError) {
        console.warn('Failed to notify Discord of roll result:', discordError.message);
        // Continue even if Discord notification fails
      }
    }
    
    res.json({
      success: true,
      message: 'Force roll completed successfully',
      item: {
        id: storageItem.id,
        name: storageItem.Item ? storageItem.Item.name : 'Unknown Item',
        icon: storageItem.Item ? storageItem.Item.icon : null
      },
      results: {
        winner: winner ? {
          id: winner.id,
          user_id: winner.user_id,
          username: winner.username,
          avatar_url: winner.avatar_url,
          roll_value: winner.roll_value,
          need_or_greed: winner.need_or_greed
        } : null,
        allRolls: rollResults
      }
    });
  } catch (error) {
    console.error('Force roll error:', error);
    res.status(500).json({ error: 'Failed to force roll', details: error.message });
  }
});

module.exports = router;