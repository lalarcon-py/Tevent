// routes/waitlist.js
const express = require('express');
const router = express.Router();
const { LootRequest, Item, User } = require('../models');

// Get all wait list requests
router.get('/', async (req, res) => {
  try {
    const waitListItems = await LootRequest.findAll({
      include: [
        {
          model: GuildStorageItem,
          include: [{
            model: Item,
            attributes: ['name', 'type', 'icon', 'dkp_cost']
          }]
        },
        {
          model: User,
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(waitListItems);
  } catch (error) {
    console.error('Error fetching wait list:', error);
    res.status(500).json({ error: 'Failed to fetch wait list' });
  }
});

// Create new request
router.post('/', async (req, res) => {
  try {
    const { storageItemId } = req.body;  // Changed from itemId to storageItemId
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;

    // Check if user already has a pending request for this item
    const existingRequest = await LootRequest.findOne({
      where: {
        storage_item_id: storageItemId,  // Match column name
        user_id: userId,
        status: 'Pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending request for this item' 
      });
    }

    const newRequest = await LootRequest.create({
      storage_item_id: storageItemId,  // Match column name
      user_id: userId,
      status: 'Pending',
      priority: 0
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ 
      error: 'Failed to create request',
      details: error.message
    });
  }
});

// Update request status (approve/reject)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await LootRequest.findOne({
      where: { id },
      include: [{
        model: GuildStorageItem,
        include: [Item]
      }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await request.update({ status });

    // If approved, update item quantity
    if (status === 'Approved') {
      if (request.GuildStorageItem.quantity > 0) {
        await request.GuildStorageItem.decrement('quantity');
      }
    }

    res.json(request);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;