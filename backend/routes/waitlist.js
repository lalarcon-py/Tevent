// routes/waitlist.js
const express = require('express');
const router = express.Router();
const { WaitList, Item, Player } = require('../models');

// Get all wait list requests
router.get('/', async (req, res) => {
  try {
    const waitListItems = await WaitList.findAll({
      include: [
        {
          model: User,
          attributes: ['username', 'avatar_url']
        },
        {
          model: GuildStorageItem,
          as: 'StorageItem',
          include: [{
            model: Item,
            attributes: ['name', 'type', 'icon']
          }],
          attributes: ['trait', 'dkp_cost']
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
    const playerId = req.user.id; // Assuming authentication middleware

    // Check if player already has a pending request for this item
    const existingRequest = await WaitList.findOne({
      where: {
        itemId,
        playerId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this item' });
    }

    const newRequest = await WaitList.create({
      itemId,
      playerId,
      status: 'pending'
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
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