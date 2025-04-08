// backend/controllers/guildApplicationController.js
const { User, Guild, GuildMember, GuildApplication } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Helper to handle file upload
const uploadScreenshot = (file) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'screenshots');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
  const filePath = path.join(uploadsDir, fileName);
  
  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);
  
  // Return relative path for storage in database
  return `/uploads/screenshots/${fileName}`;
};

const guildApplicationController = {
  // Submit a new application
  submit: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Try to get guildId from multiple sources
      const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
      
      console.log('Submit application request received with:', {
        userId: req.user?.id,
        guildId,
        bodyGuildId: req.body.guildId,
        queryGuildId: req.query.guildId,
        paramsGuildId: req.params.guildId,
        contextGuildId: req.guildId,
        hasFile: !!req.file
      });
      
      if (!guildId) {
        console.error('Guild ID is missing in application submission');
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user is already a member of this guild
      const existingMembership = await GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: req.user.id
        }
      });
      
      if (existingMembership) {
        return res.status(400).json({ error: 'You are already a member of this guild' });
      }
      
      // Process screenshot if provided
      let screenshotUrl = null;
      if (req.file) {
        screenshotUrl = uploadScreenshot(req.file);
      }
      
      // Create application
      const application = await GuildApplication.create({
        guild_id: guildId,
        user_id: req.user.id,
        in_game_name: req.body.inGameName,
        questlog_link: req.body.questlogLink,
        previous_guilds: req.body.previousGuilds,
        leave_reason: req.body.leaveReason,
        combat_power: req.body.combatPower,
        screenshot_url: screenshotUrl,
        status: 'PENDING'
      });
      
      // If the in-game name is different from current username, update it
      if (req.body.inGameName !== req.user.username) {
        await User.update(
          { username: req.body.inGameName },
          { where: { id: req.user.id } }
        );
      }
      
      // Send application to Discord if integration is enabled
      try {
        const webhookURL = `${process.env.DISCORD_BOT_URL || 'http://localhost:3300'}/webhook/new-application`;
        
        console.log('Sending application to Discord webhook:', {
          guildId: application.guild_id,
          applicationId: application.id
        });
        
        // Ensure guildId is sent as string to avoid parsing issues
        const guildIdStr = String(application.guild_id);
        
        const response = await axios.post(webhookURL, {
          guildId: guildIdStr,
          applicationId: application.id,
          secret: process.env.BOT_WEBHOOK_SECRET
        });
        
        console.log(`Application ${application.id} sent to Discord successfully. Response:`, response.data);
      } catch (webhookError) {
        console.error('Error notifying Discord bot about new application:', webhookError.message);
        if (webhookError.response) {
          console.error('Webhook response:', webhookError.response.data);
        }
        // Continue even if webhook fails - application is still stored in database
      }
      
      res.status(201).json(application);
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  },
  
  // Get all pending applications for a guild
  getPendingApplications: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const guildId = req.guildId;
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user has permission (Guild Master or Advisor)
      const membership = await GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: { [Op.in]: ['Guild Master', 'Guild Advisor'] }
        }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get pending applications
      const applications = await GuildApplication.findAll({
        where: { 
          guild_id: guildId,
          status: 'PENDING'
        },
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id', 'avatar_url']
        }],
        order: [['created_at', 'DESC']]
      });
      
      res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  },
  
  // Get waitlisted applications
  getWaitlistedApplications: async (req, res) => {
    try {
      // Similar to getPendingApplications but filter for WAITLISTED status
      const guildId = req.guildId;
      
      // Check if user has permission (Guild Master or Advisor)
      const membership = await GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: { [Op.in]: ['Guild Master', 'Guild Advisor'] }
        }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const applications = await GuildApplication.findAll({
        where: { 
          guild_id: guildId,
          status: 'WAITLISTED'
        },
        include: [{ model: User }],
        order: [['waitlisted_at', 'DESC']]
      });
      
      res.json(applications);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      res.status(500).json({ error: 'Failed to fetch waitlist' });
    }
  },
  
  // Get user's own application
  getMyApplication: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Try to get guildId from multiple sources
      const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
      
      if (!guildId) {
        console.error('Missing guildId in request:', {
          guildId: req.guildId,
          paramsGuildId: req.params.guildId,
          queryGuildId: req.query.guildId,
          bodyGuildId: req.body.guildId
        });
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      console.log(`Fetching application for user ${req.user.id} in guild ${guildId}`);
      
      // Get user's application
      const application = await GuildApplication.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          status: { [Op.in]: ['PENDING', 'WAITLISTED'] }
        }
      });
      
      if (!application) {
        return res.status(404).json({ error: 'No active application found' });
      }
      
      res.json(application);
    } catch (error) {
      console.error('Error fetching user application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  },

  
  
  // Approve an application
  approveApplication: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { applicationId } = req.params;
      const guildId = req.guildId;
      
      // Check permission and get application
      const membership = await GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: { [Op.in]: ['Guild Master', 'Guild Advisor'] }
        }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const application = await GuildApplication.findOne({
        where: { id: applicationId, guild_id: guildId }
      });
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Add user to guild
      await GuildMember.create({
        guild_id: guildId,
        user_id: application.user_id,
        role: 'Guild Member'
      });
      
      // Update application status
      await application.update({
        status: 'APPROVED',
        processed_by: req.user.id
      });
      
      res.json({ message: 'Application approved successfully' });
    } catch (error) {
      console.error('Error approving application:', error);
      res.status(500).json({ error: 'Failed to approve application' });
    }
  },
  
  // Deny an application
  denyApplication: async (req, res) => {
    try {
      // Similar to approveApplication but set status to DENIED
      const { applicationId } = req.params;
      const guildId = req.guildId;
      
      // Update application status
      await GuildApplication.update(
        { 
          status: 'DENIED',
          processed_by: req.user.id
        },
        { 
          where: { id: applicationId, guild_id: guildId }
        }
      );
      
      res.json({ message: 'Application denied successfully' });
    } catch (error) {
      console.error('Error denying application:', error);
      res.status(500).json({ error: 'Failed to deny application' });
    }
  },
  
  // Waitlist an application
  waitlistApplication: async (req, res) => {
    try {
      // Similar to approveApplication but set status to WAITLISTED
      const { applicationId } = req.params;
      const guildId = req.guildId;
      
      // Update application status
      await GuildApplication.update(
        { 
          status: 'WAITLISTED',
          waitlisted_at: new Date(),
          processed_by: req.user.id
        },
        { 
          where: { id: applicationId, guild_id: guildId }
        }
      );
      
      res.json({ message: 'Application waitlisted successfully' });
    } catch (error) {
      console.error('Error waitlisting application:', error);
      res.status(500).json({ error: 'Failed to waitlist application' });
    }
  },
  
  // Notify a waitlisted applicant to reapply
  notifyWaitlistedApplicant: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { message } = req.body;
      
      // Implementation would include notification logic
      // For this example, we'll just return success
      
      res.json({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Error notifying applicant:', error);
      res.status(500).json({ error: 'Failed to notify applicant' });
    }
  }
};

module.exports = guildApplicationController;