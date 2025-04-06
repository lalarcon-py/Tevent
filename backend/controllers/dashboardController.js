const { User, Event, EventParticipant } = require('../models');
const db = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const dashboardController = {
  getMemberStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const guildId = req.guildId; // Get from middleware
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Use guild_id directly in the query
      const users = await User.findAll({
        where: { guild_id: guildId }
      });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = {
        total_members: users.length,
        active_members: users.filter(u => u.status === 'Active').length,
        inactive_members: users.filter(u => u.status === 'Inactive').length,
        new_members_30d: users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length,
        role_distribution: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {})
      };

      res.json(stats);
    } catch (error) {
      console.error('Error in getMemberStats:', error);
      res.status(500).json({ error: 'Failed to fetch member stats', details: error.message });
    }
  },

  getCombatStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const guildId = req.guildId;
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }

      const users = await User.findAll({
        where: { guild_id: guildId },
        attributes: ['id', 'builds', 'combat_power'],
        raw: true
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
          const buildsData = user.builds;
          let builds = [];
          
          if (Array.isArray(buildsData)) {
            builds = buildsData;
          } else if (typeof buildsData === 'string') {
            builds = JSON.parse(buildsData);
          } else if (buildsData && typeof buildsData === 'object') {
            builds = [buildsData];
          }
          
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
        } catch (error) {
          console.error('Error processing user builds:', {
            userId: user.id,
            builds: user.builds,
            error: error.message
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
  },

  getAttendanceStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Get the period parameter from the request or default to 30 days
      const period = parseInt(req.query.period) || 30;
      const guildId = req.guildId;
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
  
      // Get total member count for the guild
      const totalUsers = await User.count({
        where: { guild_id: guildId }
      });
      
      if (totalUsers === 0) {
        return res.json({
          total_events: 0,
          average_attendance_rate: 0,
          attendance_history: []
        });
      }
  
      // Calculate cutoff date based on period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - period);
  
      // Get all events in period with participants, tentatives, and absentees
      const events = await Event.findAll({
        where: {
          guild_id: guildId,
          event_time: {
            [Op.gte]: cutoffDate
          }
        },
        include: [
          {
            model: EventParticipant,
            as: 'participants',
            where: { status: 'CONFIRMED' }, // Only include confirmed participants
            required: false,
            include: [{
              model: User,
              attributes: ['id', 'username', 'avatar_url']
            }]
          },
          {
            model: EventParticipant,
            as: 'tentatives',
            where: { status: 'TENTATIVE' }, // Only include tentative participants
            required: false,
            include: [{
              model: User,
              attributes: ['id', 'username', 'avatar_url']
            }]
          },
          {
            model: db.EventAbsentee,
            as: 'absentees',
            required: false,
            include: [{
              model: User,
              attributes: ['id', 'username', 'avatar_url']
            }]
          }
        ],
        order: [['event_time', 'DESC']]
      });
  
      // Process each event into standardized format
      const attendanceHistory = events.map(event => {
        // Get participants count
        const participantCount = event.participants?.length || 0;
        
        // Calculate actual percentage - make sure division results in 0 when nobody attended
        const attendanceRate = totalUsers > 0 ? (participantCount / totalUsers) * 100 : 0;
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.event_time,
          event_time: event.event_time, // Include both to make sure frontend has correct field
          attendance_count: participantCount,
          attendance_rate: attendanceRate, // Actual percentage, not defaulted
          total_members: totalUsers,
          participants: event.participants || [],
          tentatives: event.tentatives || [],
          absentees: event.absentees || []
        };
      });
      
      // Calculate overall attendance rate - only count confirmed participants
      const averageAttendanceRate = events.length > 0 ? 
        attendanceHistory.reduce((sum, event) => sum + event.attendance_rate, 0) / events.length : 0;
  
      // Clear response structure with exactly the fields frontend expects
      const response = {
        total_events: events.length,
        average_attendance_rate: averageAttendanceRate,
        attendance_history: attendanceHistory,
        total_members: totalUsers
      };
  
      // Log the output for debugging
      console.log("Attendance data being sent:", JSON.stringify(response, null, 2));
      
      res.json(response);
    } catch (error) {
      console.error('Error in getAttendanceStats:', error);
      res.status(500).json({ error: 'Failed to fetch attendance stats', details: error.message });
    }
  },

  getWeaponStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const guildId = req.guildId;
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }

      const users = await User.findAll({
        where: { guild_id: guildId },
        attributes: ['builds']
      });

      const stats = {
        weapon_combinations: [],
        total_builds: 0
      };

      users.forEach(user => {
        if (!user.builds) return;
        
        const builds = Array.isArray(user.builds[0]) ? user.builds[0] : user.builds;
        if (!Array.isArray(builds)) return;
        
        stats.total_builds += builds.length;
        
        builds.forEach(build => {
          if (!build?.primary || !build?.secondary) return;
          
          const combo = `${build.primary} + ${build.secondary}`;
          let existing = stats.weapon_combinations.find(wc => wc.combination === combo);
          
          if (!existing) {
            existing = {
              combination: combo,
              count: 0,
              specs: {}
            };
            stats.weapon_combinations.push(existing);
          }
          
          existing.count++;
          if (build.spec) {
            existing.specs[build.spec] = (existing.specs[build.spec] || 0) + 1;
          }
        });
      });

      res.json(stats);
    } catch (error) {
      console.error('Error in getWeaponStats:', error);
      res.status(500).json({ error: 'Failed to fetch weapon stats', details: error.message });
    }
  }
};

module.exports = dashboardController;