const express = require('express');
const router = express.Router();
const { Item, LootRequest, DKPTransaction, GuildStorageItem, User } = require('../models');
const discordWebhook = require('../utils/discord');

// Submit Loot Request
router.post('/request', async (req, res) => {
  try {
    const { storageItemId } = req.body;
    const userId = req.user.id;

    // Find the storage item and related item info
    const storageItem = await GuildStorageItem.findByPk(storageItemId, {
      include: [Item]
    });
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }

    // Check for existing request
    const existingRequest = await LootRequest.findOne({
      where: {
        storage_item_id: storageItemId,
        user_id: userId,
        status: 'Pending',
        guild_id: req.guildId
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this item' });
    }

    const request = await LootRequest.create({
      storage_item_id: storageItemId,
      user_id: userId,
      priority: req.user.dkpBalance || 0,
      status: 'Pending',
      guild_id: req.guildId 
    });

    // Send Discord notification
    await discordWebhook.send({
      content: `📢 **New Loot Request**\n${storageItem.Item.name} requested by: <@${userId}>`
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Loot request error:', error);
    res.status(500).json({ error: 'Loot request failed' });
  }
});

// Admin: Approve/Deny/Shelve Request
router.put('/request/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Find request with all related data
    const request = await LootRequest.findByPk(req.params.id, {
      include: [
        { 
          model: GuildStorageItem, 
          include: [Item]  // Include Item data from storage item
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
      // Check if item is still available
      if (request.GuildStorageItem.quantity < 1) {
        return res.status(400).json({ error: 'Item no longer available in storage' });
      }

      // Decrement quantity
      await request.GuildStorageItem.decrement('quantity');
      
      // Create DKP transaction using storage item's cost
      await DKPTransaction.create({
        user_id: request.user_id,
        amount: -request.GuildStorageItem.dkp_cost,
        reason: `Purchased ${request.GuildStorageItem.Item.name}${
          request.GuildStorageItem.trait ? ` with ${request.GuildStorageItem.trait}` : ''
        }`
      });

      // Send Discord notification
      await discordWebhook.send({
        content: `🎉 **Item Distributed**\n${request.GuildStorageItem.Item.name}${
          request.GuildStorageItem.trait ? ` with ${request.GuildStorageItem.trait}` : ''
        } to ${request.User.username}`
      });
    } else if (status === 'Denied') {
      // Send Discord notification for denial
      await discordWebhook.send({
        content: `❌ **Request Denied**\n${request.GuildStorageItem.Item.name} request from ${request.User.username} has been denied`
      });
    }

    // Update request status
    await request.update({ status });

    // Return updated request with all related data
    const updatedRequest = await LootRequest.findByPk(req.params.id, {
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

    res.json(updatedRequest);
    
  } catch (error) {
    console.error('Request update error:', error);
    res.status(500).json({ 
      error: 'Request update failed',
      details: error.message 
    });
  }
});

// Get Waitlist
router.get('/waitlist', async (req, res) => {
  try {
    const requests = await LootRequest.findAll({
      where: { status: 'Pending' },
      include: [
        { model: GuildStorageItem, include: [Item] },
        { model: User }
      ],
      order: [['priority', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

router.post('/storage', async (req, res) => {
  try {
    const { itemId, quantity, trait, dkpCost } = req.body;
    
    const storageItem = await GuildStorageItem.create({
      item_id: itemId,
      quantity: quantity || 0,
      trait: trait || null,
      dkp_cost: dkpCost || 0
    });

    const item = await Item.findByPk(itemId);
    
    await discordWebhook.send({
      content: `📦 **New Item in Storage**\n${item.name} x${quantity || 0}${trait ? ` with trait: ${trait}` : ''} added to guild storage`
    });

    res.status(201).json(storageItem);
  } catch (error) {
    console.error('Storage add error:', error);
    res.status(500).json({ error: 'Failed to add item to storage' });
  }
});

// Check Item Availability
router.get('/items/:name', async (req, res) => {
  const item = await Item.findOne({ 
    where: { name: req.params.name } 
  });
  res.json({ exists: !!item, ...item?.toJSON() });
});