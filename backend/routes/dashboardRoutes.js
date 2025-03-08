const express = require('express');
const router = express.Router();
const db = require('../models');
const { sequelize } = require('../models');

const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

router.get('/stats/members', isAuthenticated, async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: ['id', 'status', 'builds', 'combat_power', 'created_at'],
      raw: true
    });

    const totalMembers = users.length;
    const activeMembers = users.filter(user => user.status === 'Active').length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newMembers30d = users.filter(user => 
      new Date(user.created_at) >= thirtyDaysAgo
    ).length;

    // Role distribution from builds
    const roleDistribution = {};
    users.forEach(user => {
      if (user.builds) {
        const builds = Array.isArray(user.builds) ? user.builds : JSON.parse(user.builds);
        builds.forEach(build => {
          if (build.spec) {
            roleDistribution[build.spec] = (roleDistribution[build.spec] || 0) + 1;
          }
        });
      }
    });

    res.json({
      total_members: totalMembers,
      active_members: activeMembers,
      new_members_30d: newMembers30d,
      role_distribution: roleDistribution
    });

  } catch (error) {
    console.error('Member stats error:', error);
    res.status(500).json({ error: 'Failed to get member stats' });
  }
});


router.get('/combat', isAuthenticated, async (req, res) => {
  try {
    
    // First, let's check what we get from a basic query
    const userCheck = await db.User.findOne();

    const users = await db.User.findAll({
      attributes: ['id', 'builds'],
      raw: true  // Add this to get plain objects
    });

    const stats = {
      roles: {},
      weapons: {
        primary: {},
        secondary: {}
      },
      specs: {}
    };

    users.forEach(user => {
      try {
        const builds = Array.isArray(user.builds) ? user.builds : JSON.parse(user.builds || '[]');
        
        builds.forEach(build => {
          if (!build) return;
          
          const role = (build.spec || '').toLowerCase();
          const weaponSpec = (build.weapon_spec || '').toLowerCase();
          const primary = (build.primary || '').toLowerCase();
          const secondary = (build.secondary || '').toLowerCase();

          if (role) stats.roles[role] = (stats.roles[role] || 0) + 1;
          if (weaponSpec) stats.specs[weaponSpec] = (stats.specs[weaponSpec] || 0) + 1;
          if (primary) stats.weapons.primary[primary] = (stats.weapons.primary[primary] || 0) + 1;
          if (secondary) stats.weapons.secondary[secondary] = (stats.weapons.secondary[secondary] || 0) + 1;
        });
      } catch (parseError) {
        console.error('Error processing user builds:', {
          userId: user.id,
          builds: user.builds,
          error: parseError.message
        });
      }
    });

    res.json(stats);

  } catch (error) {
    console.error('Combat stats error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to get combat stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add attendance endpoint
router.get('/attendance', isAuthenticated, async (req, res) => {
  try {
    const stats = await db.EventParticipant.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('role')), 'count']
      ],
      group: ['role']
    });
    res.json({ attendance: stats });
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance stats' });
  }
});

// Add weapons endpoint
router.get('/weapons', isAuthenticated, async (req, res) => {
  try {
    const stats = await db.Item.findAll({
      where: { type: 'WEAPON' },
      attributes: [
        'rarity',
        [sequelize.fn('COUNT', sequelize.col('rarity')), 'count']
      ],
      group: ['rarity']
    });
    res.json({ weapons: stats });
  } catch (error) {
    console.error('Weapon stats error:', error);
    res.status(500).json({ error: 'Failed to get weapon stats' });
  }
});

module.exports = router;