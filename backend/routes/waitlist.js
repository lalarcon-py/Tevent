const express = require('express');
const router = express.Router();
const db = require('../models');

// Get all waitlist requests
router.get('/', async (req, res) => {
  try {
    const requests = await db.LootRequest.findAll({
      where: { status: 'Pending' },
      include: [
        {
          model: GuildStorageItem,
          include: [Item]
        },
        {
          model: User,
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Create new request
router.post('/', async (req, res) => {
  try {
    const { storageItemId } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;

    // Check for existing request
    const existingRequest = await db.LootRequest.findOne({
      where: {
        storage_item_id: storageItemId,
        user_id: userId,
        status: 'Pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    const newRequest = await db.LootRequest.create({
      storage_item_id: storageItemId,
      user_id: userId,
      status: 'Pending'
    });

    const fullRequest = await db.LootRequest.findOne({
      where: { id: newRequest.id },
      include: [
        {
          model: GuildStorageItem,
          include: [Item]
        },
        {
          model: User,
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ]
    });

    res.status(201).json(fullRequest);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await db.LootRequest.findByPk(req.params.id, {
      include: [
        {
          model: GuildStorageItem,
          include: [Item]
        },
        {
          model: User
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (status === 'Approved') {
      // Decrease quantity in storage
      if (request.db.GuildStorageItem.quantity > 0) {
        await request.db.GuildStorageItem.decrement('quantity');
      }
    }

    await request.update({ status });
    res.json(request);
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;