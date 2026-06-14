const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();
const db = require('../models');
const { Sequelize, Op } = require('sequelize');

router.get('/stats/members', authenticateJWT, async (req, res) => {
  try {
    const guildId = req.guildId || req.query.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const users = await db.User.findAll({
      where: { guild_id: guildId },
      attributes: ['id', 'status', 'builds', 'combat_power', 'created_at'],
      raw: true
    });

    const totalMembers = users.length;
    const activeMembers = users.filter(user => user.status === 'Active').length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Make sure to log some examples of user created dates for debugging
    if (users.length > 0) {
      console.log('Example user creation dates:');
      users.slice(0, 3).forEach(user => {
        console.log(`User ID ${user.id}: created_at = ${user.created_at}`);
      });
    }
    
    const newMembers30d = users.filter(user => {
      if (!user.created_at) return false;
      const createDate = new Date(user.created_at);
      return createDate >= thirtyDaysAgo;
    }).length;

    // Role distribution from builds
    const roleDistribution = {};
    users.forEach(user => {
      if (user.builds) {
        let builds;
        try {
          builds = Array.isArray(user.builds) ? user.builds : JSON.parse(user.builds);
        } catch (e) {
          console.warn(`Failed to parse builds for user ${user.id}`, e);
          builds = [];
        }
        
        builds.forEach(build => {
          if (build && build.spec) {
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


router.get('/combat', authenticateJWT, async (req, res) => {
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

// Add attendance stats endpoint with date filtering
router.get('/stats/attendance', authenticateJWT, async (req, res) => {
  try {
    const guildId = req.guildId || req.query.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log(`Fetching attendance stats for guild: ${guildId}`);
    
    // Get total member count for the guild
    const totalUsers = await db.User.count({
      where: { guild_id: guildId }
    });
    
    console.log(`Total users in guild: ${totalUsers}`);
    
    if (totalUsers === 0) {
      return res.json({
        total_events: 0,
        average_attendance_rate: 0,
        attendance_history: []
      });
    }
    
    // Get the past 90 days of events by default
    // This will let the frontend filter by 7d, 14d, 30d, 90d as needed
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    console.log(`Fetching events since: ${ninetyDaysAgo.toISOString()}`);
    
    // Get all events in period with participants
    const events = await db.Event.findAll({
      where: {
        guild_id: guildId,
        event_time: {
          [Op.gte]: ninetyDaysAgo
        }
      },
      include: [{
        model: db.EventParticipant,
        as: 'participants',
        required: false
      }],
      order: [['event_time', 'DESC']]
    });
    
    console.log(`Found ${events.length} events`);
    
    // Log some details about the first event if it exists
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log(`First event details:`);
      console.log(`- ID: ${firstEvent.id}`);
      console.log(`- Title: ${firstEvent.title}`);
      console.log(`- Event time: ${firstEvent.event_time}`);
      console.log(`- Participants count: ${firstEvent.participants ? firstEvent.participants.length : 0}`);
    }
    
    // Process each event into standardized format
    const attendanceHistory = events.map(event => {
      // Only count CONFIRMED participants as attended
      const confirmedParticipants = event.participants ? 
        event.participants.filter(p => p.status === 'CONFIRMED') : [];
      const participantCount = confirmedParticipants.length;
      
      // Calculate actual percentage
      const attendanceRate = totalUsers > 0 ? (participantCount / totalUsers) * 100 : 0;
      
      return {
        id: event.id,
        title: event.title,
        date: event.event_time,
        attendance_count: participantCount,
        attendance_rate: attendanceRate,
        total_members: totalUsers
      };
    });
    
    // Calculate overall attendance rate across all events
    const averageAttendanceRate = events.length > 0 ? 
      attendanceHistory.reduce((sum, event) => sum + event.attendance_rate, 0) / events.length : 0;
    
    // Create the response object
    const response = {
      total_events: events.length,
      average_attendance_rate: averageAttendanceRate,
      attendance_history: attendanceHistory
    };
    
    console.log(`Sending attendance data with ${attendanceHistory.length} events and ${averageAttendanceRate.toFixed(2)}% average rate`);
    
    res.json(response);
    
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance stats' });
  }
});

// Add weapons endpoint
router.get('/weapons', authenticateJWT, async (req, res) => {
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