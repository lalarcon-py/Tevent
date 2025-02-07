const express = require('express');
const router = express.Router();
const { Item, LootRequest, DKPTransaction, User } = require('../models');
const discordWebhook = require('../utils/discord');
const { Op } = require('sequelize');

// Submit Loot Request
router.post('/request', async (req, res) => {
  try {
    const { itemId, userId } = req.body;
    const item = await Item.findByPk(itemId);
    
    const request = await LootRequest.create({
      ItemId: itemId,
      UserId: req.user.id, // Use the authenticated user's ID
      priority: req.user.dkpBalance,
      status: 'Pending'
    });

    // Fetch the complete request with User and Item information
    const completeRequest = await LootRequest.findByPk(request.id, {
      include: [
        {
          model: Item,
          attributes: ['id', 'name', 'type', 'icon', 'dkpCost', 'inStorage', 'quantity']
        },
        {
          model: User,
          attributes: ['id', 'username', 'discord_id', 'avatar_url']
        }
      ]
    });

    res.status(201).json(completeRequest);
  } catch (error) {
    console.error('Loot request failed:', error);
    res.status(500).json({ error: 'Loot request failed' });
  }
});

// Admin: Approve Request
router.put('/request/:id/approve', async (req, res) => {
 try {
   const request = await LootRequest.findByPk(req.params.id, {
     include: [Item, User]
   });

   if (!request) {
     return res.status(404).json({ error: 'Request not found' });
   }

   // Get all other requests for this item
   const otherRequests = await LootRequest.findAll({
     where: {
       ItemId: request.ItemId,
       id: { [Op.ne]: request.id },
       status: 'Pending'
     },
     include: [User]
   });

   // Update the item and create DKP transaction
   if (request.Item.inStorage) {
     await request.Item.decrement('quantity');
     await DKPTransaction.create({
       UserId: request.UserId,
       amount: -request.Item.dkpCost,
       reason: `Purchased ${request.Item.name}`
     });
   }

   // Update approved request
   await request.update({ status: 'Approved' });

   // Deny other requests
   for (const otherRequest of otherRequests) {
     await otherRequest.update({ status: 'Denied' });
     // Notify denied users
     await discordWebhook.send({
       content: `❌ Your request for ${request.Item.name} has been denied as it was awarded to another player.`
     });
   }

   // Notify approved user
   await discordWebhook.send({
     content: `🎉 **Item Distributed**\n${request.Item.name} has been awarded to ${request.User.username}`
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
router.delete('/request/:id', async (req, res) => {
 try {
   const request = await LootRequest.findByPk(req.params.id, {
     include: [Item, User]
   });

   if (!request) {
     return res.status(404).json({ error: 'Request not found' });
   }

   await request.destroy();

   // Notify user of deletion
   await discordWebhook.send({
     content: `🗑️ Your request for ${request.Item.name} has been deleted.`
   });

   res.json({ success: true });
 } catch (error) {
   console.error('Delete request failed:', error);
   res.status(500).json({ error: 'Failed to delete request' });
 }
});

// Get Waitlist
router.get('/waitlist', async (req, res) => {
  try {
    // Add cache control header
    res.set('Cache-Control', 'private, max-age=5');

    const requests = await LootRequest.findAll({
      where: { status: 'Pending' },
      include: [
        {
          model: Item,
          attributes: ['id', 'name', 'type', 'icon', 'dkpCost', 'inStorage', 'quantity']
        },
        {
          model: User,
          attributes: ['id', 'username', 'discord_id', 'avatar_url']
        }
      ],
      order: [['priority', 'DESC']]
    });

    // Only log once for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Waitlist fetched');
    }

    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch waitlist:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
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