// backend/controllers/guildSettingsController.js
const { Guild } = require('../models');
const db = require('../models'); // Add this import 
const { Op } = require('sequelize');

const guildSettingsController = {
  // Get guild settings
  getGuildSettings: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { guildId } = req.params;
      const guild = await Guild.findByPk(guildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      // Return the settings (provide defaults for values not in DB yet)
      res.json({
        name: guild.name,
        lastNameChange: guild.last_name_change || null,
        dkpEnabled: guild.dkp_enabled !== false, // default to true
        maxTanks: guild.max_tanks || 10,
        maxHealers: guild.max_healers || 15,
        maxDps: guild.max_dps || 75,
        minAttendanceThreshold: guild.min_attendance_threshold || 60,
        attendanceWarningMessage: guild.attendance_warning_message || 
          "You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown."
      });
    } catch (error) {
      console.error('Error getting guild settings:', error);
      res.status(500).json({ 
        error: 'Failed to fetch guild settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update guild settings
  updateGuildSettings: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { guildId } = req.params;
      const { settingGroup, settings } = req.body;
      
      // Verify the user is a guild master
      const membership = await db.GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master'
        }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'Only Guild Masters can update settings' });
      }
      
      const guild = await Guild.findByPk(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      // Update different settings based on the group
      let updateData = {};
      
      switch (settingGroup) {
        case 'general':
          // Handle name change with 30-day restriction
          if (settings.name && settings.name !== guild.name) {
            if (guild.last_name_change) {
              const lastChange = new Date(guild.last_name_change);
              const now = new Date();
              const daysSinceChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
              
              if (daysSinceChange < 30) {
                return res.status(400).json({ 
                  error: `Guild name can only be changed once every 30 days. ${30 - daysSinceChange} days remaining.` 
                });
              }
            }
            
            updateData.name = settings.name;
            updateData.last_name_change = new Date();
          }
          break;
          
        case 'dkp':
          if (settings.dkpEnabled !== undefined) {
            updateData.dkp_enabled = settings.dkpEnabled;
          }
          break;
          
        case 'roles':
          if (settings.maxTanks !== undefined) updateData.max_tanks = settings.maxTanks;
          if (settings.maxHealers !== undefined) updateData.max_healers = settings.maxHealers;
          if (settings.maxDps !== undefined) updateData.max_dps = settings.maxDps;
          break;
          
        case 'attendance':
          if (settings.minAttendanceThreshold !== undefined) {
            updateData.min_attendance_threshold = settings.minAttendanceThreshold;
          }
          if (settings.attendanceWarningMessage !== undefined) {
            updateData.attendance_warning_message = settings.attendanceWarningMessage;
          }
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid setting group' });
      }
      
      // Update the guild
      await guild.update(updateData);
      
      res.json({ 
        message: 'Guild settings updated successfully',
        settings: {
          ...updateData,
          // Transform snake_case DB fields to camelCase for the response
          lastNameChange: updateData.last_name_change,
          dkpEnabled: updateData.dkp_enabled,
          maxTanks: updateData.max_tanks,
          maxHealers: updateData.max_healers,
          maxDps: updateData.max_dps,
          minAttendanceThreshold: updateData.min_attendance_threshold,
          attendanceWarningMessage: updateData.attendance_warning_message
        }
      });
    } catch (error) {
      console.error('Error updating guild settings:', error);
      res.status(500).json({ 
        error: 'Failed to update guild settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = guildSettingsController;