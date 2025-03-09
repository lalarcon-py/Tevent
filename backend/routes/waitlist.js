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

    const isAdmin = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(req.user.role);
    
    const whereClause = isAdmin 
      ? { guild_id: guildId, status: 'Pending' } 
      : { guild_id: guildId, user_id: req.user.id, status: 'Pending' };
    
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
      order: [['created_at', 'DESC']]
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
      
      // Update the quantity
      await request.storageItem.update({ quantity: newQuantity });
      console.log(`Updated item ${request.storageItem.id} quantity to ${newQuantity}`);
      
      // If quantity reaches 0, don't delete but mark as out of stock
      if (newQuantity === 0) {
        // Find all pending requests for this item
        const pendingRequests = await db.LootRequest.findAll({
          where: { 
            storage_item_id: request.storageItem.id,
            status: 'Pending',
            id: { [db.Sequelize.Op.ne]: request.id } // Exclude current request
          }
        });
        
        // Update all pending requests to "Denied - Out of Stock"
        if (pendingRequests.length > 0) {
          await db.LootRequest.update(
            { status: 'Denied - Out of Stock' },
            { where: { id: pendingRequests.map(req => req.id) } }
          );
        }
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
          console.log(`Removed item ${request.storageItem?.item_id} from wishlist for user ${request.user_id}`);
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
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request', details: error.message });
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

    const { storageItemId } = req.body;
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    if (!storageItemId) {
      return res.status(400).json({ error: 'Storage item ID is required' });
    }
    
    // Check if item exists
    const storageItem = await db.GuildStorageItem.findByPk(storageItemId);
    if (!storageItem) {
      return res.status(404).json({ error: 'Item not found in storage' });
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

    // Create the request
    const newRequest = await db.LootRequest.create({
      guild_id: guildId,
      storage_item_id: storageItemId,
      user_id: req.user.id,
      status: 'Pending',
      priority: 0 // You might want to calculate this based on user DKP
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

    res.status(201).json(fullRequest);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});

module.exports = router;