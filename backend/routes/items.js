const express = require('express');
const router = express.Router();
const { Item, StorageItem } = require('../models');
const { isOfficer } = require('../middleware/auth');
const { Op } = require('sequelize');

// Fetch all storage items with their item details
router.get('/', async (req, res) => {
  try {
    const storageItems = await StorageItem.findAll({
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });
    res.json(storageItems);
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add item to storage
router.post('/', async (req, res) => {
  try {
    const { itemId, dkpCost, quantity } = req.body;
    
    const storageItem = await StorageItem.create({
      itemId,
      dkpCost,
      quantity,
      inStorage: true
    });

    const newStorageItem = await StorageItem.findOne({
      where: { id: storageItem.id },
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });

    res.status(201).json(newStorageItem);
  } catch (error) {
    console.error('Error adding item to storage:', error);
    res.status(500).json({ error: 'Failed to add item to storage' });
  }
});

// Remove from storage
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await StorageItem.destroy({ where: { id } });
    res.status(200).json({ message: 'Item removed from storage' });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Update storage item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dkpCost, inStorage, quantity } = req.body;

    const storageItem = await StorageItem.findByPk(id);
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }

    await storageItem.update({ dkpCost, inStorage, quantity });
    
    const updatedStorageItem = await StorageItem.findOne({
      where: { id },
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });

    res.json(updatedStorageItem);
  } catch (error) {
    console.error('Error updating storage item:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Get template items for autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const items = await Item.findAll({
      attributes: ['id', 'name', 'type', 'icon'],
      order: [['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;