// backend/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const { WishList, Item, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get user's wishlist
 */
router.get('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const guildId = req.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Get wishlist items by guild_id filter
    const wishlistItems = await WishList.findAll({
      where: {
        user_id: req.user.id,
        guild_id: guildId
      },
      include: [{
        model: Item,
        required: false
      }],
      order: [['priority', 'DESC']]
    });
    
    res.json(wishlistItems);
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
});

/**
 * Get another user's wishlist
 */
router.get('/user/:userId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { userId } = req.params;
    const guildId = req.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Get wishlist items by guild_id filter
    const wishlistItems = await WishList.findAll({
      where: {
        user_id: userId,
        guild_id: guildId
      },
      include: [{
        model: Item,
        required: false
      }],
      order: [['priority', 'DESC']]
    });
    
    res.json(wishlistItems);
  } catch (error) {
    console.error('User wishlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user\'s wishlist items' });
  }
});

/**
 * Add item to wishlist
 */
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { itemId, itemName, itemType, notes, priority } = req.body;
    const guildId = req.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Check if item already exists in wishlist
    const existingItem = await WishList.findOne({
      where: {
        user_id: req.user.id,
        guild_id: guildId,
        [Op.or]: [
          { item_id: itemId },
          { item_name: itemName }
        ]
      }
    });
    
    if (existingItem) {
      return res.status(400).json({ error: 'Item already in wishlist' });
    }
    
    // Create new wishlist item
    const newItem = await WishList.create({
      user_id: req.user.id,
      guild_id: guildId,
      item_id: itemId,
      item_name: itemName,
      item_type: itemType,
      notes,
      priority: parseInt(priority) || 0
    });
    
    // Return with item details
    const wishlistItem = await WishList.findByPk(newItem.id, {
      include: [{
        model: Item,
        required: false
      }]
    });
    
    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
});

/**
 * Update wishlist item
 */
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { notes, priority } = req.body;
    const guildId = req.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Find the item
    const wishlistItem = await WishList.findOne({
      where: {
        id,
        user_id: req.user.id,
        guild_id: guildId
      }
    });
    
    if (!wishlistItem) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }
    
    // Update item
    await wishlistItem.update({
      notes: notes !== undefined ? notes : wishlistItem.notes,
      priority: priority !== undefined ? parseInt(priority) : wishlistItem.priority
    });
    
    // Return updated item with details
    const updatedItem = await WishList.findByPk(id, {
      include: [{
        model: Item,
        required: false
      }]
    });
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Update wishlist item error:', error);
    res.status(500).json({ error: 'Failed to update wishlist item' });
  }
});

/**
 * Delete wishlist item
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const guildId = req.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Find the item
    const wishlistItem = await WishList.findOne({
      where: {
        id,
        user_id: req.user.id,
        guild_id: guildId
      }
    });
    
    if (!wishlistItem) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }
    
    // Delete item
    await wishlistItem.destroy();
    
    res.status(200).json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('Delete wishlist item error:', error);
    res.status(500).json({ error: 'Failed to delete wishlist item' });
  }
});

module.exports = router;