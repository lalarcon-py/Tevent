// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const db = require('../models');
const { Op } = require('sequelize');
const { logAdminAction } = require('../utils/adminLogger');

// Apply admin auth middleware to all routes
router.use(adminAuth);

// Get all guilds (for admin purposes)
router.get('/guilds', async (req, res) => {
  try {
    const guilds = await db.Guild.findAll({
      include: [
        {
          model: db.Subscription,
          required: false
        }
      ]
    });
    
    res.json(guilds);
  } catch (error) {
    console.error('Admin get guilds error:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get guild details including members
router.get('/guilds/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const guild = await db.Guild.findByPk(guildId, {
      include: [
        {
          model: db.Subscription,
          required: false
        }
      ]
    });
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const members = await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'discord_id']
      }]
    });
    
    res.json({
      guild,
      members
    });
  } catch (error) {
    console.error('Admin get guild details error:', error);
    res.status(500).json({ error: 'Failed to fetch guild details' });
  }
});

// Delete a guild
router.delete('/guilds/:guildId', async (req, res) => {
    const t = await db.sequelize.transaction();
    
    try {
      const { guildId } = req.params;
      
      // Get guild info before deleting it (for the log)
      const guild = await db.Guild.findByPk(guildId);
      
      // Delete all guild members
      await db.GuildMember.destroy({
        where: { guild_id: guildId },
        transaction: t
      });
      
      // Delete the guild
      await db.Guild.destroy({
        where: { id: guildId },
        transaction: t
      });
      
      await t.commit();
      
      // Log the admin action
      await logAdminAction(
        req.user.id,
        'DELETE_GUILD',
        'guild',
        guildId,
        { guildName: guild?.name }
      );
      
      res.status(200).json({ message: 'Guild deleted successfully' });
    } catch (error) {
      await t.rollback();
      console.error('Admin delete guild error:', error);
      res.status(500).json({ error: 'Failed to delete guild' });
    }
  });

// Update guild subscription
router.post('/guilds/:guildId/subscription', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { action, newExpiryDate, planId } = req.body;
    
    // Log the admin action
    console.log(`Admin ${req.user.id} is updating subscription for guild ${guildId}: ${action}`);
    
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    let subscription = await db.Subscription.findOne({
      where: { guild_id: guildId }
    });
    
    if (action === 'extend' && newExpiryDate) {
      if (subscription) {
        await subscription.update({
          expiry_date: new Date(newExpiryDate),
          status: 'active',
          plan_id: planId || subscription.plan_id || 'monthly'
        });
      } else {
        subscription = await db.Subscription.create({
          guild_id: guildId,
          plan_id: planId || 'monthly',
          start_date: new Date(),
          expiry_date: new Date(newExpiryDate),
          status: 'active'
        });
      }
      
      // Ensure guild is active
      await guild.update({ status: 'ACTIVE' });
      
    } else if (action === 'cancel') {
      if (subscription) {
        await subscription.update({
          status: 'cancelled',
          cancelled_at: new Date()
        });
      }
    }
    
    res.json({ 
      message: `Subscription ${action === 'extend' ? 'extended' : 'cancelled'} successfully`,
      subscription
    });
  } catch (error) {
    console.error('Admin update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.get('/guilds/:guildId/storage', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const storageItems = await db.GuildStorageItem.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.Item
      }]
    });
    
    res.json(storageItems);
  } catch (error) {
    console.error('Admin get guild storage error:', error);
    res.status(500).json({ error: 'Failed to fetch guild storage' });
  }
});

// Get guild storage items
router.get('/guilds/:guildId/storage', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const storageItems = await db.GuildStorageItem.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.Item
      }]
    });
    
    res.json(storageItems);
  } catch (error) {
    console.error('Admin get guild storage error:', error);
    res.status(500).json({ error: 'Failed to fetch guild storage' });
  }
});

// Get guild loot requests
router.get('/guilds/:guildId/loot-requests', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const lootRequests = await db.LootRequest.findAll({
      where: { guild_id: guildId },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [{ model: db.Item }]
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'username', 'avatar_url', 'discord_id']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json(lootRequests);
  } catch (error) {
    console.error('Admin get loot requests error:', error);
    res.status(500).json({ error: 'Failed to fetch loot requests' });
  }
});

// Get guild wishlists
router.get('/guilds/:guildId/wishlists', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const wishlists = await db.WishList.findAll({
      where: { guild_id: guildId },
      include: [
        {
          model: db.Item
        },
        {
          model: db.User,
          attributes: ['id', 'username', 'avatar_url', 'discord_id']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ]
    });
    
    res.json(wishlists);
  } catch (error) {
    console.error('Admin get wishlists error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
});

// Get all items (for admin autocomplete)
router.get('/items', async (req, res) => {
  try {
    const items = await db.Item.findAll({
      attributes: ['id', 'name', 'type', 'icon', 'rarity'],
      order: [['name', 'ASC']]
    });
    
    res.json(items);
  } catch (error) {
    console.error('Admin get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// CRUD operations for storage items in admin context

// Add item to guild storage (admin version)
router.post('/guilds/:guildId/storage', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { item_id, quantity, trait, dkp_cost } = req.body;
    
    // Check if item exists
    const item = await db.Item.findByPk(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Create or update storage item
    let storageItem = await db.GuildStorageItem.findOne({
      where: {
        guild_id: guildId,
        item_id: item_id,
        trait: trait || null
      }
    });
    
    if (storageItem) {
      // Update existing item
      await storageItem.update({
        quantity: storageItem.quantity + (parseInt(quantity) || 1),
        dkp_cost: dkp_cost !== undefined ? dkp_cost : storageItem.dkp_cost
      });
    } else {
      // Create new item
      storageItem = await db.GuildStorageItem.create({
        guild_id: guildId,
        item_id: item_id,
        quantity: parseInt(quantity) || 1,
        trait: trait || null,
        dkp_cost: dkp_cost || 0
      });
    }
    
    // Log admin action
    await logAdminAction(
      req.user.id,
      'ADD_STORAGE_ITEM',
      'storage_item',
      storageItem.id,
      { 
        guild_id: guildId,
        item_id: item_id,
        item_name: item.name,
        quantity: parseInt(quantity) || 1
      }
    );
    
    // Return with item details
    const fullItem = await db.GuildStorageItem.findByPk(storageItem.id, {
      include: [{ model: db.Item }]
    });
    
    res.status(201).json(fullItem);
  } catch (error) {
    console.error('Admin add storage item error:', error);
    res.status(500).json({ error: 'Failed to add storage item' });
  }
});

// Update guild storage item
router.put('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { quantity, dkp_cost, trait, guildId } = req.body;
    
    // Require guild ID
    if (!guildId && !req.query.guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify user has permission
    const guildMember = await db.GuildMember.findOne({
      where: { 
        guild_id: guildId || req.query.guildId, 
        user_id: req.user.id 
      }
    });
    
    if (!guildMember || !['Guild Master', 'Guild Advisor'].includes(guildMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const storageItem = await db.GuildStorageItem.findByPk(id);
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Update fields if provided with validation
    if (quantity !== undefined) {
      // Ensure quantity is not negative
      storageItem.quantity = Math.max(0, parseInt(quantity, 10));
    }
    
    if (dkp_cost !== undefined) storageItem.dkp_cost = dkp_cost;
    if (trait !== undefined) storageItem.trait = trait;
    
    // Delete the item if quantity is 0
    if (storageItem.quantity === 0) {
      // First, delete any associated loot requests
      await db.LootRequest.destroy({
        where: { storage_item_id: id }
      });
      
      // Then delete the storage item
      await storageItem.destroy();
      
      return res.json({ 
        message: 'Storage item deleted due to zero quantity',
        deleted: true
      });
    }
    
    await storageItem.save();
    
    // Get the full item with its associations
    const fullItem = await db.GuildStorageItem.findByPk(id, {
      include: [db.Item]
    });
    
    res.json(fullItem);
  } catch (error) {
    console.error('Error updating storage item:', error);
    res.status(500).json({ error: 'Failed to update storage item', details: error.message });
  }
});

const { v4: uuidv4 } = require('uuid'); // Make sure to import this at the top

// Add fake user for testing
router.post('/fake-users', async (req, res) => {
  try {
    const { username, role, avatar_url, combat_power, status, guildId } = req.body;
    
    // Validate inputs
    if (!username || !guildId) {
      return res.status(400).json({ error: 'Username and guildId are required' });
    }

    // Generate a proper UUID instead of a fake-prefixed string
    const fakeUserId = uuidv4();
    const fakeTag = `FAKE-${Math.random().toString(36).substring(2, 6)}`;
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Begin transaction
    const t = await db.sequelize.transaction();
    
    try {
      // Create user record with guild_id = null (global user)
      const user = await db.User.create({
        id: fakeUserId,
        username: `${username} [${fakeTag}]`, // Add a tag to indicate fake user
        discord_id: `fake-${Math.random().toString(36).substring(2, 9)}`,
        avatar_url: avatar_url || null,
        role: 'Member',
        status: status || 'Active',
        combat_power: combat_power || 1000,
        builds: [
          {
            primary: 'Greatsword',
            secondary: 'Crossbow',
            spec: 'DPS'
          }
        ],
        // Store fake status in metadata since we don't have an is_fake_user field
        email: `fake-test-user@example.com` // Use email field to track fake users
      }, { transaction: t });
      
      // Create guild member entry
      await db.GuildMember.create({
        guild_id: guildId,
        user_id: fakeUserId,
        role: role || 'Guild Member',
        joined_via_invite: false,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction: t });
      
      // Track fake users in admin logs
      await db.AdminLog.create({
        admin_id: req.user.id,
        action: 'CREATE_FAKE_USER',
        details: { username, role, guildId, fakeTag },
        target_type: 'user',
        target_id: fakeUserId
      }, { transaction: t });
      
      await t.commit();
      
      res.status(201).json({
        id: fakeUserId,
        username: `${username} [${fakeTag}]`,
        role,
        message: 'Fake user created successfully'
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create fake user error:', error);
    res.status(500).json({ 
      error: 'Failed to create fake user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update delete fake users endpoint to check the email field
router.delete('/fake-users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow deleting fake test users
    const user = await db.User.findByPk(userId);
    if (!user || !user.email || !user.email.startsWith('fake-test-user')) {
      return res.status(403).json({ error: 'Can only delete fake test users' });
    }
    
    const t = await db.sequelize.transaction();
    
    try {
      // Remove from all guilds
      await db.GuildMember.destroy({
        where: { user_id: userId },
        transaction: t
      });
      
      // Delete the user
      await db.User.destroy({
        where: { id: userId },
        transaction: t
      });
      
      // Log admin action
      await db.AdminLog.create({
        admin_id: req.user.id,
        action: 'DELETE_FAKE_USER',
        details: { userId, username: user.username },
        target_type: 'user',
        target_id: userId
      }, { transaction: t });
      
      await t.commit();
      
      res.json({ message: 'Fake user deleted successfully' });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Delete fake user error:', error);
    res.status(500).json({ error: 'Failed to delete fake user' });
  }
});

// Delete guild storage item
router.delete('/guilds/:guildId/storage/:id', async (req, res) => {
  try {
    const { guildId, id } = req.params;
    
    // Find the storage item for logging
    const storageItem = await db.GuildStorageItem.findOne({
      where: {
        id,
        guild_id: guildId
      },
      include: [{ model: db.Item }]
    });
    
    if (!storageItem) {
      return res.status(404).json({ error: 'Storage item not found' });
    }
    
    // Delete associated loot requests
    await db.LootRequest.destroy({
      where: { storage_item_id: id }
    });
    
    // Delete the storage item
    await storageItem.destroy();
    
    // Log admin action
    await logAdminAction(
      req.user.id,
      'DELETE_STORAGE_ITEM',
      'storage_item',
      id,
      { 
        guild_id: guildId,
        item_name: storageItem.Item?.name
      }
    );
    
    res.json({ message: 'Storage item deleted successfully' });
  } catch (error) {
    console.error('Admin delete storage item error:', error);
    res.status(500).json({ error: 'Failed to delete storage item' });
  }
});

// Update loot request status (approve/deny)
router.put('/guilds/:guildId/loot-requests/:id', async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const { status } = req.body;
    
    if (!['Approved', 'Denied', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Find the request
    const request = await db.LootRequest.findOne({
      where: {
        id,
        guild_id: guildId
      },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [{ model: db.Item }]
        },
        {
          model: db.User,
          as: 'user'
        }
      ]
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Loot request not found' });
    }
    
    // Update request status
    await request.update({ status });
    
    // If approved, decrease item quantity
    if (status === 'Approved' && request.storageItem) {
      const newQuantity = Math.max(0, request.storageItem.quantity - 1);
      await request.storageItem.update({ quantity: newQuantity });
    }
    
    // Log admin action
    await logAdminAction(
      req.user.id,
      `${status.toUpperCase()}_LOOT_REQUEST`,
      'loot_request',
      id,
      { 
        guild_id: guildId,
        item_name: request.storageItem?.Item?.name,
        user: request.user?.username
      }
    );
    
    res.json({ message: `Loot request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Admin update loot request error:', error);
    res.status(500).json({ error: 'Failed to update loot request' });
  }
});

// Get admin logs
router.get('/logs', async (req, res) => {
    try {
      const logs = await db.AdminLog.findAll({
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url']
        }],
        order: [['created_at', 'DESC']],
        limit: 100 // Limit to most recent 100 logs
      });
      
      res.json(logs);
    } catch (error) {
      console.error('Admin logs error:', error);
      res.status(500).json({ error: 'Failed to fetch admin logs' });
    }
  });

router.get('/users', async (req, res) => {
    try {
      // Get all users from global users table
      const users = await db.User.findAll({
        where: { guild_id: null }, // Only get global user records
        attributes: ['id', 'username', 'discord_id', 'email', 'avatar_url', 'created_at']
      });
      
      // For each user, get their guild memberships
      const usersWithMemberships = await Promise.all(users.map(async (user) => {
        const memberships = await db.GuildMember.findAll({
          where: { user_id: user.id },
          include: [{
            model: db.Guild,
            attributes: ['id', 'name', 'status']
          }],
          attributes: ['role', 'created_at']
        });
        
        return {
          ...user.toJSON(),
          memberships: memberships.map(m => ({
            guildId: m.guild_id,
            guildName: m.Guild?.name || 'Unknown Guild',
            guildStatus: m.Guild?.status,
            role: m.role,
            joinedAt: m.created_at
          }))
        };
      }));
      
      res.json(usersWithMemberships);
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  // Get user details
  router.get('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user record
      const user = await db.User.findByPk(userId, {
        attributes: ['id', 'username', 'discord_id', 'email', 'avatar_url', 'created_at']
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get user's guild memberships
      const memberships = await db.GuildMember.findAll({
        where: { user_id: userId },
        include: [{
          model: db.Guild,
          attributes: ['id', 'name', 'status']
        }],
        attributes: ['role', 'created_at']
      });
      
      res.json({
        user,
        memberships: memberships.map(m => ({
          guildId: m.guild_id,
          guildName: m.Guild?.name || 'Unknown Guild',
          guildStatus: m.Guild?.status,
          role: m.role,
          joinedAt: m.created_at
        }))
      });
    } catch (error) {
      console.error('Admin get user details error:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

router.get('/test-admin', adminAuth, (req, res) => {
    res.json({ 
      message: 'You are an admin!', 
      userId: req.user.id,
      adminIds: process.env.ADMIN_USER_IDS.split(',')
    });
  });

  

module.exports = router;