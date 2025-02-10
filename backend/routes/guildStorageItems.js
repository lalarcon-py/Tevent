const express = require('express');
const router = express.Router();
const { Item, GuildStorageItem } = require('../models');
const { Op } = require('sequelize');

// Get all guild storage items
router.get('/', async (req, res) => {
  try {
    const storageItems = await GuildStorageItem.findAll({
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });

    const formattedItems = storageItems.map(storageItem => ({
      id: storageItem.id,
      itemId: storageItem.item_id,
      name: storageItem.Item.name,
      type: storageItem.Item.type,
      icon: storageItem.Item.icon,
      quantity: storageItem.quantity,
      trait: storageItem.trait,
      dkpCost: storageItem.dkpCost,
      inStorage: true
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({ error: 'Failed to fetch storage items' });
  }
});

// Add/Update guild storage item
router.post('/', async (req, res) => {
    try {
      const { itemId, quantity, trait, dkpCost } = req.body;
      console.log('Received request body:', req.body); // Debug log
  
      const existingItem = await GuildStorageItem.findOne({
        where: { item_id: itemId }
      });
  
      let storageItem;
      if (existingItem) {
        storageItem = await existingItem.update({
          quantity: existingItem.quantity + quantity,
          trait,
          dkpCost
        });
      } else {
        storageItem = await GuildStorageItem.create({
          item_id: itemId,
          quantity,
          trait,
          dkpCost
        });
      }
  
      // Fetch the associated item details
      const item = await Item.findByPk(itemId);
      
      const response = {
        id: storageItem.id,
        itemId: storageItem.item_id,
        name: item.name,
        type: item.type,
        icon: item.icon,
        quantity: storageItem.quantity,
        trait: storageItem.trait,
        dkpCost: storageItem.dkpCost,
        inStorage: true
      };
  
      console.log('Sending response:', response); // Debug log
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating/updating storage item:', error);
      res.status(500).json({ error: 'Failed to create/update storage item' });
    }
  });

// Update guild storage item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, trait, dkpCost } = req.body;

    const storageItem = await GuildStorageItem.findByPk(id);
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }

    await storageItem.update({
      quantity,
      trait,
      dkpCost
    });

    res.json(storageItem);
  } catch (error) {
    console.error('Error updating storage item:', error);
    res.status(500).json({ error: 'Failed to update storage item' });
  }
});

// Delete guild storage item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete storage item:', id);
    const storageItem = await GuildStorageItem.findByPk(id);
    
    if (!storageItem) {
      console.log('Storage item not found');
      return res.status(404).json({ error: 'Storage item not found' });
    }

    console.log('Found storage item:', storageItem.toJSON());
    await storageItem.destroy();
    console.log('Storage item deleted');
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;