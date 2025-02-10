const express = require('express');
const router = express.Router();
const { Item, LootRequest, DKPTransaction, User, GuildStorageItem } = require('../models');
const discordWebhook = require('../utils/discord');
const { Op } = require('sequelize');

// Submit Loot Request
router.post('/request', async (req, res) => {
  try {
    const request = await LootRequest.create({
      status: 'Pending',
      priority: 0,
      user_id: req.user.id,
      storage_item_id: req.body.storage_item_id
    });

    const completeRequest = await LootRequest.findByPk(request.id, {
      include: [
        { model: User },
        { 
          model: GuildStorageItem,
          as: 'StorageItem',
          include: [Item]
        }
      ]
    });

    res.status(201).json(completeRequest);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve Request
router.put('/request/:id/approve', async (req, res) => {
  try {
    const request = await LootRequest.findByPk(req.params.id, {
      include: [
        { model: User },
        { 
          model: GuildStorageItem,
          as: 'StorageItem',
          include: [Item]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const otherRequests = await LootRequest.findAll({
      where: {
        storage_item_id: request.storage_item_id,
        id: { [Op.ne]: request.id },
        status: 'Pending'
      },
      include: [User]
    });

    // Update the storage item quantity
    if (request.StorageItem.quantity > 0) {
      await request.StorageItem.decrement('quantity');
      
      // Delete storage item if quantity reaches 0
      if (request.StorageItem.quantity <= 1) {
        await request.StorageItem.destroy();
      }
    }

    await request.update({ status: 'Approved' });
    res.json(request);

    // Deny other requests
    for (const otherRequest of otherRequests) {
      await otherRequest.update({ status: 'Denied' });
      await discordWebhook.send({
        content: `❌ Your request for ${request.StorageItem.Item.name} has been denied as it was awarded to another player.`
      });
    }

    await discordWebhook.send({
      content: `🎉 **Item Distributed**\n${request.StorageItem.Item.name} has been awarded to ${request.User.username}`
    });

    res.json(request);
  } catch (error) {
    console.error('Approve request failed:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Admin: Deny Request
router.put('/request/:id/deny', async (req, res) => {
  try {
    const request = await LootRequest.findByPk(req.params.id, {
      include: [Item, User]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Delete the request instead of updating status
    await request.destroy();

    // Notify denied user
    await discordWebhook.send({
      content: `❌ <@${request.User.discord_id}>, your request for ${request.Item.name} has been denied.`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Deny request failed:', error);
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

// Delete Request
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting storage item:', id);

    const { LootRequest } = require('../models');

    // Delete associated loot requests first
    await LootRequest.destroy({
      where: { storage_item_id: id }
    });

    // Then delete storage item
    const numDeleted = await GuildStorageItem.destroy({
      where: { id }
    });

    if (numDeleted === 0) {
      return res.status(404).json({ error: 'Storage item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get Waitlist
router.get('/waitlist', async (req, res) => {
  try {
    const requests = await LootRequest.findAll({
      where: { status: 'Pending' },
      include: [
        { model: User },
        { 
          model: GuildStorageItem,
          as: 'StorageItem',
          include: [{ model: Item }]
        }
      ],
      logging: console.log
    });
    res.json(requests);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      sql: error.sql,
      original: error.original
    });
    res.status(500).json({ error: error.message });
  }
});

// Check Item Availability
router.get('/items/:name', async (req, res) => {
 try {
   const item = await Item.findOne({ 
     where: { name: req.params.name } 
   });
   res.json({ exists: !!item, ...item?.toJSON() });
 } catch (error) {
   console.error('Failed to check item availability:', error);
   res.status(500).json({ error: 'Failed to check item availability' });
 }
});

module.exports = router;