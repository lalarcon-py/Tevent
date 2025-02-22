// routes/waitlist.js
const express = require('express');
const router = express.Router();
const { LootRequest, Item, User } = require('../models');

// Get all wait list requests
router.get('/', async (req, res) => {
  try {
    const waitListItems = await db.LootRequest.findAll({
      include: [
        {
          model: db.Item,
          attributes: ['name', 'type', 'icon', 'dkpCost']
        },
        {
          model: db.User,
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ],
      order: [['createdAt', 'DESC']]
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
    const { itemId } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;

    // Check if user already has a pending request for this item
    const existingRequest = await LootRequest.findOne({
      where: {
        storage_item_id: itemId,
        user_id: userId,
        status: 'Pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending request for this item' 
      });
    }

    // Note: id is UUID type and will be auto-generated
    const newRequest = await LootRequest.create({
      storage_item_id: itemId,
      user_id: userId,
      status: 'Pending',
      priority: 0  // Added this since it has a default in your schema
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

    const request = await WaitList.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await request.update({ status });

    // If approved, update item quantity
    if (status === 'approved') {
      const item = await Item.findByPk(request.itemId);
      if (item.quantity > 0) {
        await item.update({ quantity: item.quantity - 1 });
      }
    }

    res.json(request);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;