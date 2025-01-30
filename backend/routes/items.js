const express = require('express');
const router = express.Router();
const { query } = require('../services/db');
const { Item } = require('../models');
const { isOfficer } = require('../middleware/auth');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/', async (req, res) => {
    try {
      const { rows } = await query('SELECT * FROM items');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// Update item (admin only)
router.put('/:id', isOfficer, async (req, res) => {
  try {
    const { id } = req.params;
    const { dkpCost, inStorage, quantity, icon } = req.body;
    
    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await item.update({ dkpCost, inStorage, quantity, icon });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Add these to your existing backend setup
module.exports = router;