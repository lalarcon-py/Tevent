const express = require('express');
const router = express.Router();
const db = require('../models');
const models = require('../models');

// Get all waitlist requests
router.get('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Require guild ID
    const guildId = req.query.guildId || req.params.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const isAdmin = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(req.user.role);
    
    // If admin, get all requests, otherwise only user's own requests
    const whereClause = isAdmin ? {} : { user_id: req.user.id };
    
    const requests = await models.LootRequest.findAll({
      where: { 
        status: 'Pending',
        user_id: req.user.id  // Only get the current user's requests
      },
      include: [
        {
          model: models.GuildStorageItem,
          as: 'storageItem',
          include: [
            {
              model: models.Item,
              attributes: ['name', 'type', 'icon']
            }
          ]
        },
        {
          model: models.User,
          as: 'user',
          attributes: ['username', 'discord_id', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    console.log('Returning user waitlist:', requests.length, 'items');
    res.json(requests);
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist', details: error.message });
  }
});

// Create new request
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { storageItemId, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
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

// Update request status
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { status, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const request = await db.LootRequest.findByPk(id, {
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [db.Item]
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

    if (status === 'Approved') {
      // Decrease quantity in storage
      if (request.storageItem && request.storageItem.quantity > 0) {
        await request.storageItem.decrement('quantity');
      }
    }

    await request.update({ status });
    res.json(request);
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Approve request
router.put('/:id/approve', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const guildId = req.query.guildId || req.body.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const request = await db.LootRequest.findByPk(id, {
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [db.Item]
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
    
    // Verify storage has item
    if (request.storageItem && request.storageItem.quantity <= 0) {
      return res.status(400).json({ error: 'Item not available in storage' });
    }
    
    // Update request status
    await request.update({ status: 'Approved' });
    
    // Decrement storage quantity
    if (request.storageItem) {
      await request.storageItem.decrement('quantity');
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// Deny request
router.put('/:id/deny', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const guildId = req.query.guildId || req.body.guildId;
    
    // Require guild ID
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const request = await db.LootRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Update request status
    await request.update({ status: 'Denied' });
    
    res.json(request);
  } catch (error) {
    console.error('Error denying request:', error);
    res.status(500).json({ error: 'Failed to deny request', details: error.message });
  }
});

// Delete request
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
    
    const result = await db.LootRequest.destroy({
      where: { id }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request', details: error.message });
  }
});

module.exports = router;