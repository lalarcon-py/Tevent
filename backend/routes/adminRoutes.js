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