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