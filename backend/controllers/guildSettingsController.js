// backend/controllers/guildSettingsController.js
const db = require('../models');
const { Op } = require('sequelize');

const guildSettingsController = {
  // Get guild settings
  getGuildSettings: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
  
      const { guildId } = req.params;
      const guild = await db.Guild.findByPk(guildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }
  
      // Debug the raw value
      console.log('DKP DEBUG - Database value:', {
        raw: guild.dkp_enabled,
        type: typeof guild.dkp_enabled
      });
  
      // Make it explicitly true/false by forcing a boolean comparison
      const dkpEnabledValue = guild.dkp_enabled === true;
      
      console.log('DKP DEBUG - Sending to frontend:', {
        value: dkpEnabledValue,
        type: typeof dkpEnabledValue
      });
  
      // Return the settings as a plain object with explicit boolean
      res.json({
        name: guild.name,
        lastNameChange: guild.last_name_change || null,
        dkpEnabled: dkpEnabledValue, // Explicit boolean true/false
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

  directDkpCheck: async (req, res) => {
    try {
      const { guildId } = req.params;
      
      // Use raw SQL to bypass any ORM issues
      const [results] = await db.sequelize.query(
        `SELECT dkp_enabled FROM guilds WHERE id = :guildId`,
        { 
          replacements: { guildId },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      // Log and return the direct value
      console.log('DIRECT DKP CHECK:', results);
      
      res.json({
        dkpEnabled: results.dkp_enabled === true,
        rawValue: results.dkp_enabled,
        valueType: typeof results.dkp_enabled
      });
    } catch (error) {
      console.error('Direct DKP check error:', error);
      res.status(500).json({ error: error.message });
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
      
      const guild = await db.Guild.findByPk(guildId);
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
              // Ensure we're storing a boolean
              updateData.dkp_enabled = settings.dkpEnabled === true;
              console.log('Updating dkp_enabled to:', updateData.dkp_enabled, 'from input:', settings.dkpEnabled);
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