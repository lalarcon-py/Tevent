// backend/controllers/gearCheckController.js
const { GearCheck, User } = require('../models');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'gear');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Check if user has admin permissions
const hasAdminRole = (role) => {
  return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(role);
};

const gearCheckController = {
  // Request a gear check from a user
  requestGearCheck: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { userId } = req.body;
      const guildId = req.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if requestor has permission
      if (!hasAdminRole(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Verify user exists
      const targetUser = await User.findOne({
        where: { id: userId }
      });
      
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Then check if they're a member of this guild
      const membership = await GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: userId
        }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'User is not a member of this guild' });
      }
      
      // Check if there's already an active request
      const existingCheck = await GearCheck.findOne({
        where: {
          user_id: userId,
          guild_id: guildId,
          status: {
            [Op.in]: ['requested', 'pending']
          }
        }
      });
      
      if (existingCheck) {
        return res.status(409).json({ 
          error: 'This user already has an active gear check',
          status: existingCheck.status
        });
      }
      
      // Create a new gear check request
      const gearCheck = await GearCheck.create({
        user_id: userId,
        guild_id: guildId,
        status: 'requested',
        requested_by: req.user.id,
        image_url: '' // Will be populated when user uploads
      });
      
      res.status(201).json({
        id: gearCheck.id,
        status: 'requested',
        message: 'Gear check requested successfully'
      });
    } catch (error) {
      console.error('Error requesting gear check:', error);
      res.status(500).json({ error: 'Failed to request gear check' });
    }
  },
  
  // Upload a gear check screenshot
  // In backend/controllers/gearCheckController.js

  uploadGearCheck: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const guildId = req.guildId || req.body.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user exists
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Process the upload
      try {
        const uploadsDir = ensureUploadDir();
        const fileName = `${uuidv4()}${path.extname(req.file.originalname || '.jpg')}`;
        const filePath = path.join(uploadsDir, fileName);
        const fileUrl = `/uploads/gear/${fileName}`;
        
        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);
        
        // Create a new submission regardless of previous state
        // This is a temporary workaround until the database is fully migrated
        const newGearCheck = await GearCheck.create({
          user_id: req.user.id,
          guild_id: guildId,
          image_url: fileUrl,
          status: 'pending'
        });
        
        res.status(201).json({
          success: true,
          message: 'Gear check submitted successfully',
          id: newGearCheck.id,
          status: 'pending',
          url: fileUrl
        });
      } catch (saveError) {
        console.error('Error saving file:', saveError);
        return res.status(500).json({ error: 'Failed to save uploaded file', details: saveError.message });
      }
    } catch (error) {
      console.error('Error uploading gear check:', error);
      res.status(500).json({ error: 'Failed to upload gear check', details: error.message });
    }
  },
  
  // Approve a gear check
  approveGearCheck: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { gearCheckId } = req.params;
      const guildId = req.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user has permission
      if (!hasAdminRole(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Find the gear check
      const gearCheck = await GearCheck.findOne({
        where: {
          id: gearCheckId,
          guild_id: guildId,
          status: 'pending'
        },
        include: [{ model: User, as: 'user' }]
      });
      
      if (!gearCheck) {
        return res.status(404).json({ error: 'Gear check not found or not pending' });
      }
      
      // Update gear check status
      await gearCheck.update({
        status: 'approved',
        reviewed_by: req.user.id
      });
      
      // Update the user's gear_screenshot_url as well for easy access
      await User.update(
        { gear_screenshot_url: gearCheck.image_url },
        { where: { id: gearCheck.user_id } }
      );
      
      res.json({
        success: true,
        message: 'Gear check approved successfully',
        status: 'approved'
      });
    } catch (error) {
      console.error('Error approving gear check:', error);
      res.status(500).json({ error: 'Failed to approve gear check' });
    }
  },
  
  // Deny a gear check
  denyGearCheck: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { gearCheckId } = req.params;
      const { reason } = req.body;
      const guildId = req.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user has permission
      if (!hasAdminRole(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Denial reason is required' });
      }
      
      // Find the gear check
      const gearCheck = await GearCheck.findOne({
        where: {
          id: gearCheckId,
          guild_id: guildId,
          status: 'pending'
        }
      });
      
      if (!gearCheck) {
        return res.status(404).json({ error: 'Gear check not found or not pending' });
      }
      
      // Update gear check status
      await gearCheck.update({
        status: 'Denied',
        denial_reason: reason,
        reviewed_by: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Gear check denied successfully',
        status: 'Denied'
      });
    } catch (error) {
      console.error('Error denying gear check:', error);
      res.status(500).json({ error: 'Failed to deny gear check' });
    }
  },
  
  // Get gear check status for a user
  getUserGearCheckStatus: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { userId } = req.params;
      const guildId = req.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Users can check their own status or admins can check any
      if (userId !== req.user.id && !hasAdminRole(req.user.role)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Find the latest gear check for this user
      const gearCheck = await GearCheck.findOne({
        where: { 
          user_id: userId,
          guild_id: guildId
        },
        order: [['created_at', 'DESC']]
      });
      
      if (!gearCheck) {
        return res.json({ status: 'none' });
      }
      
      res.json({
        status: gearCheck.status,
        imageUrl: gearCheck.image_url,
        denialReason: gearCheck.denial_reason,
        createdAt: gearCheck.created_at,
        updatedAt: gearCheck.updated_at
      });
    } catch (error) {
      console.error('Error fetching gear check status:', error);
      res.status(500).json({ error: 'Failed to fetch gear check status' });
    }
  },
  
  // List all recent gear checks (admin only)
  listGearChecks: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const guildId = req.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // Check if user has permission
      if (!hasAdminRole(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Get filter parameters
      const { status } = req.query;
      
      // Build query filters
      const filters = {
        guild_id: guildId
      };
      
      // Add status filter if provided
      if (status && ['requested', 'pending', 'approved', 'denied'].includes(status)) {
        filters.status = status;
      }
      
      // Get only checks from the last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      filters.created_at = {
        [Op.gte]: fourteenDaysAgo
      };
      
      // Get the gear checks
      const gearChecks = await GearCheck.findAll({
        where: filters,
        include: [
          { 
            model: User, 
            as: 'user',
            attributes: ['id', 'username', 'avatar_url'] 
          },
          { 
            model: User, 
            as: 'reviewer',
            attributes: ['id', 'username', 'avatar_url'],
            required: false
          }
        ],
        order: [
          ['status', 'ASC'], // Pending first, then requested, etc.
          ['created_at', 'DESC']
        ]
      });
      
      res.json(gearChecks);
    } catch (error) {
      console.error('Error listing gear checks:', error);
      res.status(500).json({ error: 'Failed to list gear checks' });
    }
  },
  
  // Cleanup old gear checks (to be called by a cron job)
  cleanupOldGearChecks: async () => {
    try {
      // Calculate date threshold (14 days ago)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      // Find old gear checks
      const oldGearChecks = await GearCheck.findAll({
        where: {
          created_at: {
            [Op.lt]: fourteenDaysAgo
          }
        },
        attributes: ['id', 'image_url', 'created_at']
      });
      
      // Delete files and records
      for (const check of oldGearChecks) {
        try {
          // Extract file path from URL
          if (check.image_url) {
            const fileName = check.image_url.split('/').pop();
            const filePath = path.join(__dirname, '..', 'uploads', 'gear', fileName);
            
            // Delete physical file if it exists
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          
          // Delete record
          await check.destroy();
        } catch (err) {
          console.error(`Error deleting gear check ${check.id}:`, err);
        }
      }
      
      return {
        success: true,
        deletedCount: oldGearChecks.length,
        message: `Deleted ${oldGearChecks.length} gear checks older than 14 days`
      };
    } catch (error) {
      console.error('Error in gear check cleanup job:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = gearCheckController;