const { User, Event, EventParticipant } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const dashboardController = {
  getMemberStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const users = await User.findAll();
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

      const users = await User.findAll({
        where: {
          combat_power: {
            [Op.not]: null
          }
        }
      });

      const cpValues = users.map(u => u.combat_power).filter(Boolean);

      const stats = {
        average_cp: cpValues.length ? Math.round(cpValues.reduce((a, b) => a + b, 0) / cpValues.length) : 0,
        max_cp: Math.max(...cpValues, 0),
        min_cp: Math.min(...cpValues, Infinity),
        cp_distribution: cpValues.reduce((acc, cp) => {
          const range = cp < 1000 ? '<1000' :
                       cp < 2000 ? '1000-2000' :
                       cp < 3000 ? '2000-3000' : '3000+';
          if (!acc[range]) acc[range] = 0;
          acc[range]++;
          return acc;
        }, {})
      };

      res.json({
        ...stats,
        cp_distribution: Object.entries(stats.cp_distribution).map(([cp_range, count]) => ({
          cp_range,
          count
        }))
      });
    } catch (error) {
      console.error('Error in getCombatStats:', error);
      res.status(500).json({ error: 'Failed to fetch combat stats', details: error.message });
    }
  },

  getAttendanceStats: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const events = await Event.findAll({
        include: [{
          model: EventParticipant,
          as: 'participants'
        }],
        where: {
          event_time: {
            [Op.gte]: thirtyDaysAgo
          }
        }
      });

      const totalUsers = await User.count();
      const stats = {
        total_events: events.length,
        average_attendance_rate: events.length ? 
          (events.reduce((sum, event) => sum + event.participants.length, 0) / (events.length * totalUsers)) * 100 : 0,
        attendance_history: events.map(event => ({
          date: event.event_time,
          attendance_count: event.participants.length,
          attendance_rate: (event.participants.length / totalUsers) * 100
        }))
      };

      res.json(stats);
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

      const users = await User.findAll({
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