const express = require('express');
const router = express.Router();
const { Item, LootRequest, DKPTransaction } = require('../models');
const discordWebhook = require('../utils/discord');

// Submit Loot Request
router.post('/request', async (req, res) => {
  try {
    const { itemId, userId } = req.body;
    const item = await Item.findByPk(itemId);
    
    const request = await LootRequest.create({
      ItemId: itemId,
      UserId: userId,
      priority: req.user.dkpBalance // Sort by DKP
    });

    if(item.inStorage && item.quantity > 0) {
      await discordWebhook.send({
        content: `📢 **Item Available**\n${item.name} is in storage!\nRequested by: <@${userId}>`,
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Loot request failed' });
  }
});

// Admin: Approve/Deny Request
router.put('/request/:id', async (req, res) => {
  try {
    const request = await LootRequest.findByPk(req.params.id, {
      include: [Item, User]
    });

    if(req.body.status === 'Approved') {
      if(request.Item.inStorage) {
        await request.Item.decrement('quantity');
        await DKPTransaction.create({
          UserId: request.UserId,
          amount: -request.Item.dkpCost,
          reason: `Purchased ${request.Item.name}`
        });
      }
      await discordWebhook.send({
        content: `🎉 **Item Distributed**\n${request.Item.name} to ${request.User.name}`
      });
    }

    await request.update({ status: req.body.status });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Request update failed' });
  }
});

// Get Waitlist
router.get('/waitlist', async (req, res) => {
  const requests = await LootRequest.findAll({
    where: { status: 'Pending' },
    include: [Item, User],
    order: [['priority', 'DESC']] // Sort by DKP
  });
  res.json(requests);
});

// Check Item Availability
router.get('/items/:name', async (req, res) => {
  const item = await Item.findOne({ 
    where: { name: req.params.name } 
  });
  res.json({ exists: !!item, ...item?.toJSON() });
});