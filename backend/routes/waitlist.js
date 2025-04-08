const express = require('express');
const router = express.Router();
const db = require('../models');

// Get all waitlist requests
router.get('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check for expired requests first and update their status
    const now = new Date();
    await db.LootRequest.update(
      { status: 'Expired' },
      {
        where: {
          guild_id: guildId,
          status: 'Pending',
          expiration_time: { [db.Sequelize.Op.lt]: now }
        }
      }
    );

    const isAdmin = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(req.user.role);
    
    const whereClause = isAdmin 
      ? { guild_id: guildId, status: { [db.Sequelize.Op.ne]: 'Deleted' } } 
      : { guild_id: guildId, user_id: req.user.id };
    
    const requests = await db.LootRequest.findAll({
      where: whereClause,
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [
            {
              model: db.Item,
              attributes: ['name', 'type', 'icon']
            }
          ]
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ],
      order: [
        ['status', 'ASC'], // Pending first
        [db.Sequelize.literal(`CASE 
          WHEN need_or_greed = 'NEED_ITEM' THEN 1
          WHEN need_or_greed = 'NEED_TRAIT' THEN 2
          WHEN need_or_greed = 'GREED' THEN 3
          ELSE 4
        END`), 'ASC'], // Sort by priority: NEED_ITEM > NEED_TRAIT > GREED
        ['created_at', 'ASC'] // First come, first served
      ]
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist', details: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { status, decrementQuantity } = req.body;
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Check if user has permission
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership || !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(membership.role)) {
      return res.status(403).json({ error: 'No permission to approve/deny requests' });
    }
    
    // Find the request
    const request = await db.LootRequest.findOne({
      where: { 
        id,
        guild_id: guildId
      },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem'
        },
        {
          model: db.User,
          as: 'user'
        }
      ]
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Update request status
    await request.update({ status });
    
    // If approving, decrease the item quantity
    if (status === 'Approved' && request.storageItem) {
      // Decrement quantity
      const newQuantity = Math.max(0, request.storageItem.quantity - 1);
      
      // If quantity reaches 0, delete the item completely
      if (newQuantity === 0) {
        try {
          const storageItemId = request.storageItem.id;
          console.log(`Item quantity reached 0, deleting item ${storageItemId}`);
          
          // Step 1: Update all other pending requests to "Denied - Out of Stock"
          await db.sequelize.query(
            `UPDATE loot_requests 
             SET status = 'Denied - Out of Stock' 
             WHERE storage_item_id = ?`,
            { 
              replacements: [storageItemId],
              type: db.sequelize.QueryTypes.UPDATE
            }
          );
          
          // Step 2: Clear the foreign key references from loot_requests
          await db.sequelize.query(
            `UPDATE loot_requests 
             SET storage_item_id = NULL 
             WHERE storage_item_id = ?`,
            { 
              replacements: [storageItemId],
              type: db.sequelize.QueryTypes.UPDATE
            }
          );
          
          // Step 3: Delete the item from guild_storage_items
          const deleteResult = await db.sequelize.query(
            `DELETE FROM guild_storage_items 
             WHERE id = ?`,
            { 
              replacements: [storageItemId],
              type: db.sequelize.QueryTypes.DELETE
            }
          );
          
          console.log(`Item deleted successfully:`, deleteResult);
        } catch (error) {
          console.error('Error deleting item:', error);
          // Fallback: Just set quantity to 0 if deletion fails
          await request.storageItem.update({ quantity: 0 });
        }
      } else {
        // Just update the quantity
        await request.storageItem.update({ quantity: newQuantity });
      }
    }
    
    // If approved, also check and remove from wishlist
    if (status === 'Approved' && request.user_id) {
      try {
        // Check if item is in wishlist
        const wishlistItem = await db.WishList.findOne({
          where: {
            user_id: request.user_id,
            guild_id: guildId,
            item_id: request.storageItem?.item_id
          }
        });
        
        if (wishlistItem) {
          // Remove from wishlist
          await wishlistItem.destroy();
        }
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        // Continue despite error - don't fail the whole request
      }
    }
    
    res.json({ 
      success: true, 
      message: `Request ${status.toLowerCase()}`,
      storageUpdated: status === 'Approved' && request.storageItem !== null
    });
  } catch (error) {
    console.error('Update request error:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to update request', 
      details: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Check if user has permission
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership || !['Guild Master', 'Guild Advisor'].includes(membership.role)) {
      return res.status(403).json({ error: 'No permission to delete requests' });
    }
    
    // Delete the request
    const result = await db.LootRequest.destroy({
      where: { 
        id,
        guild_id: guildId
      }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Failed to delete request', details: error.message });
  }
});

// Create new request
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { storageItemId, needOrGreed } = req.body;
    const guildId = req.guildId || req.body.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!storageItemId) {
      return res.status(400).json({ error: 'Storage item ID is required' });
    }

    // Check if needOrGreed is valid
    if (!['NEED_ITEM', 'NEED_TRAIT', 'GREED'].includes(needOrGreed)) {
      return res.status(400).json({ error: 'Need/Greed selection must be NEED_ITEM, NEED_TRAIT, or GREED' });
    }

    // Get the storage item to check if it has a trait when NEED_TRAIT is selected
    const storageItem = await db.GuildStorageItem.findByPk(storageItemId, {
      include: [{
        model: db.Item,
        attributes: ['name']
      }]
    });
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Item not found in storage' });
    }

    // If NEED_TRAIT is selected but item has no trait, return an error
    if (needOrGreed === 'NEED_TRAIT' && !storageItem.trait) {
      return res.status(400).json({ error: 'Cannot select NEED_TRAIT for an item without a trait' });
    }

    // Check for existing request
    const existingRequest = await db.LootRequest.findOne({
      where: {
        guild_id: guildId,
        storage_item_id: storageItemId,
        user_id: req.user.id,
        status: 'Pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    // Get the timer duration from the storage item, not from the request
    const timerDuration = storageItem.timer_duration || 1440; // Default to 24 hours if not set

    // Calculate expiration time
    const requestTime = new Date();
    const expirationTime = new Date(requestTime.getTime() + timerDuration * 60000);

    // Create the request
    const newRequest = await db.LootRequest.create({
      guild_id: guildId,
      storage_item_id: storageItemId,
      user_id: req.user.id,
      status: 'Pending',
      priority: 0,
      need_or_greed: needOrGreed,
      request_time: requestTime,
      expiration_time: expirationTime
    });

    // Return the full request with associations
    const fullRequest = await db.LootRequest.findOne({
      where: { id: newRequest.id },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [
            {
              model: db.Item,
              attributes: ['name', 'type', 'icon']
            }
          ]
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ]
    });

    // Send Discord notification
    try {
      // Get the item name
      const itemName = fullRequest.storageItem?.Item?.name || 'Unknown Item';
      
      // Get Discord bot URL - using fallback as needed
      const discordBotUrl = process.env.DISCORD_BOT_URL || "http://heartfelt-sparkle.railway.internal:3300";
      
      // Notify Discord via webhook
      const axios = require('axios');
      await axios.post(`${discordBotUrl}/webhook/item-request`, {
        guildId: guildId,
        itemId: storageItemId,
        userId: req.user.id,
        username: req.user.username,
        needOrGreed: needOrGreed,
        expirationTime: expirationTime.toISOString(),
        timerDuration: timerDuration,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`Discord notification sent for item request: ${itemName}`);
    } catch (discordError) {
      console.warn('Failed to send Discord notification:', discordError.message);
      // Continue even if Discord notification fails
    }

    res.status(201).json(fullRequest);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});

module.exports = router;