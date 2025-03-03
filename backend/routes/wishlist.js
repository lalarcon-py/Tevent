// backend/routes/wishlist.js
const express = require('express');
const router = express.Router();
const db = require('../models');

// Get user's wishlist items
router.get('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const wishes = await db.WishList.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: db.Item,
        attributes: ['name', 'type', 'icon'],
        required: false
      }],
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });
    
    res.json(wishes);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist', details: error.message });
  }
});

// Add item to wishlist
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { itemId, itemName, itemType, priority, notes } = req.body;
    
    if (!itemName) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    // If itemId is provided, verify it exists
    let item = null;
    if (itemId) {
      item = await db.Item.findByPk(itemId);
    }
    
    // Create wishlist entry
    const wishlistItem = await db.WishList.create({
      user_id: req.user.id,
      item_id: item?.id || null,
      item_name: itemName,
      item_type: itemType || (item?.type || null),
      priority: priority || 0,
      notes: notes || null
    });
    
    // Return with associations
    const fullWishItem = await db.WishList.findByPk(wishlistItem.id, {
      include: [{
        model: db.Item,
        attributes: ['name', 'type', 'icon'],
        required: false
      }]
    });
    
    res.status(201).json(fullWishItem);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist', details: error.message });
  }
});

// Update wishlist item
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { priority, notes } = req.body;
    
    // Verify ownership
    const wishItem = await db.WishList.findOne({
      where: { 
        id,
        user_id: req.user.id
      }
    });
    
    if (!wishItem) {
      return res.status(404).json({ error: 'Wishlist item not found or not owned by you' });
    }
    
    // Update fields
    await wishItem.update({
      priority: priority !== undefined ? priority : wishItem.priority,
      notes: notes !== undefined ? notes : wishItem.notes
    });
    
    res.json(wishItem);
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    res.status(500).json({ error: 'Failed to update wishlist item', details: error.message });
  }
});

// Delete wishlist item
router.delete('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    
    // Verify ownership
    const result = await db.WishList.destroy({
      where: { 
        id,
        user_id: req.user.id
      }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Wishlist item not found or not owned by you' });
    }
    
    res.json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    res.status(500).json({ error: 'Failed to delete wishlist item', details: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { userId } = req.params;
    
    const wishes = await db.WishList.findAll({
      where: { user_id: userId },
      include: [{
        model: db.Item,
        attributes: ['name', 'type', 'icon'],
        required: false
      }],
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });
    
    res.json(wishes);
  } catch (error) {
    console.error('Error fetching user wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist', details: error.message });
  }
});

module.exports = router;