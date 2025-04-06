const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const db = require('../models');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

router.get('/user/:userId/attendance', isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const guildId = req.guildId || req.query.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // First, check if DKP is enabled for this guild
    const guild = await db.Guild.findByPk(guildId);
    const isDkpEnabled = guild?.dkp_enabled === true;
    
    // Get events the user has participated in
    const eventParticipation = await db.EventParticipant.findAll({
      where: { 
        user_id: userId,
        guild_id: guildId
      },
      include: [{
        model: db.Event,
        attributes: ['id', 'title', 'event_time', 'description', 'dkp_value']
      }],
      order: [['created_at', 'DESC']],
      limit: 20 // Limit to recent events
    });
    
    // Format the response
    const attendanceData = eventParticipation.map(participation => ({
      id: participation.id,
      event: {
        id: participation.Event?.id,
        title: participation.Event?.title || 'Unknown Event',
        event_time: participation.Event?.event_time
      },
      attended: true, // Since these are participation records
      date: participation.Event?.event_time || participation.created_at,
      role: participation.role,
      // Only include DKP if the feature is enabled
      ...(isDkpEnabled && { dkp_earned: participation.Event?.dkp_value || 10 })
    }));
    
    // Add DKP status to the response
    res.json({
      dkp_enabled: isDkpEnabled,
      attendance: attendanceData
    });
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
});


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
    
    console.log(`Getting attendance stats for guild ${guildId} with period ${period} days`);
    
    // Calculate period start date (events AFTER this date)
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period));
    
    // First, get all events without date filtering to check if any exist at all
    const allEvents = await db.Event.findAll({
      where: {
        guild_id: guildId
      },
      include: [
        {
          model: db.EventParticipant,
          as: 'participants',
          where: { status: 'CONFIRMED' },
          required: false,
          include: [{
            model: db.User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: db.EventParticipant,
          as: 'tentatives',
          where: { status: 'TENTATIVE' },
          required: false,
          include: [{
            model: db.User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: db.EventAbsentee,
          as: 'absentees',
          required: false,
          include: [{
            model: db.User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        }
      ],
      order: [['event_time', 'DESC']]
    });
    
    // If there are no events at all, return empty data to avoid filtering logic
    if (allEvents.length === 0) {
      console.log(`No events found for guild ${guildId} at all. Returning empty stats.`);
      const totalMembers = await db.User.count({
        where: { guild_id: guildId }
      });
      
      return res.json({
        total_events: 0,
        average_attendance_rate: 0,
        attendance_history: [],
        total_members: totalMembers,
        debug_info: {
          message: "No events found for this guild",
          guild_id: guildId
        }
      });
    }
    
    // Log the events we found before filtering
    console.log(`Found ${allEvents.length} total events for guild ${guildId}`);
    allEvents.forEach((event, index) => {
      console.log(`Event ${index + 1}: id=${event.id}, title=${event.title}, date=${event.event_time}`);
    });
    
    // Now apply period filter
    // Note: Period filtering means we're looking for events in the past {period} days
    // For example, if period is 14 days, we want events from now back to 14 days ago
    const events = allEvents.filter(event => {
      if (!event.event_time) return false;
      
      // Convert both to UTC date objects to ensure correct comparison
      const eventDate = new Date(event.event_time);
      
      // Check if event is after the cutoff date (within period)
      const timeDiff = new Date().getTime() - eventDate.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      const isWithinPeriod = dayDiff <= period;
      
      console.log(`Event ${event.id} (${event.title}): date=${eventDate.toISOString()}, days ago=${dayDiff}, period=${period}, include=${isWithinPeriod}`);
      
      return isWithinPeriod;
    });
    
    console.log(`After date filtering, ${events.length} events remain within the ${period} day period`);
    
    // Get total member count
    const totalMembers = await db.User.count({
      where: { guild_id: guildId }
    });
    
    // Calculate attendance rate
    let totalAttendance = 0;
    events.forEach(event => {
      const confirmedCount = event.participants ? event.participants.length : 0;
      totalAttendance += confirmedCount;
    });
    
    const averageAttendance = events.length > 0 ? 
      (totalAttendance / (events.length * totalMembers)) * 100 : 0;
    
    // Process all events
    const eventHistory = events.map(event => {
      const participantCount = event.participants ? event.participants.length : 0;
      const tentativeCount = event.tentatives ? event.tentatives.length : 0;
      const absenteeCount = event.absentees ? event.absentees.length : 0;
      
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.event_time,
        event_time: event.event_time, // Include both to ensure frontend has the right field
        attendance_count: participantCount,
        tentative_count: tentativeCount,
        absentee_count: absenteeCount,
        attendance_rate: totalMembers > 0 ? (participantCount / totalMembers) * 100 : 0,
        total_members: totalMembers,
        participants: event.participants || [],
        tentatives: event.tentatives || [],
        absentees: event.absentees || []
      };
    });
    
    const stats = {
      total_events: events.length,
      average_attendance_rate: averageAttendance,
      attendance_history: eventHistory,
      total_members: totalMembers,
      all_events_count: allEvents.length, // For debugging
      filtered_events_count: events.length // For debugging
    };
    
    console.log(`Returning attendance stats with ${eventHistory.length} processed events`);
    res.json(stats);
  } catch (error) {
    console.error('Error in getAttendanceStats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance stats',
      details: error.message,
      stack: error.stack
    });
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