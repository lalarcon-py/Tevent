const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};


const getMemberStats = async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const users = await db.User.findAll({
      where: { guild_id: guildId }
    });
    
    // Calculate 30-day period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Count new members in last 30 days
    const newMembers = users.filter(user => {
      const createdAt = new Date(user.created_at || user.createdAt);
      return createdAt >= thirtyDaysAgo;
    }).length;
    
    // Calculate role distribution (class distribution)
    const roleDistribution = {};
    users.forEach(user => {
      if (user.builds && Array.isArray(user.builds)) {
        user.builds.forEach(build => {
          if (build.spec) {
            roleDistribution[build.spec] = (roleDistribution[build.spec] || 0) + 1;
          }
        });
      }
    });

    const stats = {
      total_members: users.length,
      active_members: users.filter(u => u.status === 'Active').length,
      inactive_members: users.filter(u => u.status !== 'Active').length,
      new_members_30d: newMembers,
      role_distribution: roleDistribution
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getMemberStats:', error);
    res.status(500).json({ error: 'Failed to fetch member stats' });
  }
};

// Combat Stats
const getCombatStats = async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const users = await db.User.findAll({
      where: { guild_id: guildId },
      attributes: ['id', 'combat_power', 'builds']
    });
    
    // Calculate average combat power
    let totalCP = 0;
    let userCount = 0;
    users.forEach(user => {
      if (user.combat_power) {
        totalCP += parseInt(user.combat_power);
        userCount++;
      }
    });
    
    const averageCP = userCount > 0 ? Math.round(totalCP / userCount) : 0;
    
    // Get CP brackets - use default breakpoints initially
    const breakpoints = [
      { min: 0, max: 1000 },
      { min: 1001, max: 2000 },
      { min: 2001, max: 3000 },
      { min: 3001, max: 4000 },
      { min: 4001, max: Number.MAX_SAFE_INTEGER }
    ];
    
    // Count users in each bracket
    const cpDistribution = {};
    breakpoints.forEach(bp => {
      const label = `${bp.min}-${bp.max === Number.MAX_SAFE_INTEGER ? 'Max' : bp.max}`;
      cpDistribution[label] = users.filter(u => {
        const cp = parseInt(u.combat_power || 0);
        return cp >= bp.min && cp <= bp.max;
      }).length;
    });
    
    // Count roles and weapons
    const roles = {};
    const primaryWeapons = {};
    const secondaryWeapons = {};
    const specs = {};
    
    users.forEach(user => {
      if (user.builds && Array.isArray(user.builds)) {
        user.builds.forEach(build => {
          if (build.spec) {
            specs[build.spec] = (specs[build.spec] || 0) + 1;
          }
          if (build.primary) {
            primaryWeapons[build.primary] = (primaryWeapons[build.primary] || 0) + 1;
          }
          if (build.secondary) {
            secondaryWeapons[build.secondary] = (secondaryWeapons[build.secondary] || 0) + 1;
          }
        });
      }
    });
    
    const stats = {
      averageCP,
      cpDistribution,
      roles,
      weapons: {
        primary: primaryWeapons,
        secondary: secondaryWeapons
      },
      specs
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getCombatStats:', error);
    res.status(500).json({ error: 'Failed to fetch combat stats' });
  }
};

// Attendance Stats
const getAttendanceStats = async (req, res) => {
  try {
    const { guildId, period = 30 } = req.query; // Default to 30 days
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Calculate period start date
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period));
    
    // Get all events in the period
    const events = await db.Event.findAll({
      where: {
        guild_id: guildId,
        event_time: {
          [db.Sequelize.Op.gte]: periodStart
        }
      },
      include: [{
        model: db.EventParticipant,
        as: 'participants'
      }],
      order: [['event_time', 'DESC']]
    });
    
    // Get total member count
    const totalMembers = await db.User.count({
      where: { guild_id: guildId }
    });
    
    // Calculate attendance rate
    let totalAttendance = 0;
    events.forEach(event => {
      totalAttendance += event.participants.length;
    });
    
    const averageAttendance = events.length > 0 ? 
      (totalAttendance / (events.length * totalMembers)) * 100 : 0;
    
    // Get the last 7 events
    const recentEvents = events.slice(0, 7).map(event => ({
      id: event.id,
      title: event.title,
      date: event.event_time,
      attendance_count: event.participants.length,
      attendance_rate: totalMembers > 0 ? 
        (event.participants.length / totalMembers) * 100 : 0
    }));
    
    const stats = {
      total_events: events.length,
      average_attendance_rate: averageAttendance,
      attendance_history: recentEvents
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getAttendanceStats:', error);
    res.status(500).json({ error: 'Failed to fetch attendance stats' });
  }
};

// Weapon Stats
const getWeaponStats = async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const users = await db.User.findAll({
      where: { guild_id: guildId },
      attributes: ['builds']
    });
    
    const classCount = {}; // Track class counts
    const combinations = []; // Track weapon combinations
    let totalBuilds = 0;
    
    users.forEach(user => {
      if (user.builds && Array.isArray(user.builds)) {
        totalBuilds += user.builds.length;
        
        user.builds.forEach(build => {
          // Count by class type (like Liberator, Seeker, etc.)
          if (build.class) {
            classCount[build.class] = (classCount[build.class] || 0) + 1;
          } else if (build.spec) {
            // If class isn't specified, use spec as a fallback
            classCount[build.spec] = (classCount[build.spec] || 0) + 1;
          }
          
          // Track weapon combinations
          if (build.primary && build.secondary) {
            const combo = `${build.primary} + ${build.secondary}`;
            
            let existingCombo = combinations.find(c => c.combination === combo);
            if (!existingCombo) {
              existingCombo = {
                combination: combo,
                count: 0,
                specs: {}
              };
              combinations.push(existingCombo);
            }
            
            existingCombo.count++;
            
            if (build.spec) {
              existingCombo.specs[build.spec] = (existingCombo.specs[build.spec] || 0) + 1;
            }
          }
        });
      }
    });
    
    // Sort by popularity
    combinations.sort((a, b) => b.count - a.count);
    
    const stats = {
      weapon_combinations: combinations,
      class_distribution: classCount,
      total_builds: totalBuilds
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getWeaponStats:', error);
    res.status(500).json({ error: 'Failed to fetch weapon stats' });
  }
};

router.get('/members', isAuthenticated, dashboardController.getMemberStats);
router.get('/combat', isAuthenticated, dashboardController.getCombatStats);
router.get('/attendance', isAuthenticated, dashboardController.getAttendanceStats);
router.get('/weapons', isAuthenticated, dashboardController.getWeaponStats);

module.exports = router;