// backend/routes/gearCheck.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { User, GearCheck } = require('../models');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Images Only!"));
  }
});

// Check if user can admin gear checks
const canAdminGearCheck = (role) => {
  const adminRoles = ['Guild Master', 'Guild Advisor', 'Guild Guardian'];
  return adminRoles.includes(role);
};

// Get gear check status
router.get('/:userId/status', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { userId } = req.params;
    
    // Users can check their own status or admins can check any
    if (userId !== req.user.id && !canAdminGearCheck(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const gearCheck = await GearCheck.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
    if (!gearCheck) {
      return res.json({ status: 'none' });
    }
    
    res.json({
      status: gearCheck.status,
      imageUrl: gearCheck.image_url,
      reason: gearCheck.denial_reason
    });
  } catch (error) {
    console.error('Error fetching gear check status:', error);
    res.status(500).json({ error: 'Failed to fetch gear check status' });
  }
});

// Request a gear check
router.post('/request', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check permission
    if (!canAdminGearCheck(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create gear check request
    const gearCheck = await GearCheck.create({
      user_id: userId,
      status: 'requested',
      requested_by: req.user.id
    });
    
    res.status(201).json({
      id: gearCheck.id,
      status: gearCheck.status
    });
  } catch (error) {
    console.error('Error requesting gear check:', error);
    res.status(500).json({ error: 'Failed to request gear check' });
  }
});

// Upload gear check image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const userId = req.body.userId || req.user.id;
    
    // Only allow uploading for self
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Get latest gear check request
    const gearCheck = await GearCheck.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
    if (!gearCheck || (gearCheck.status !== 'requested' && gearCheck.status !== 'denied')) {
      return res.status(400).json({ error: 'No gear check request found' });
    }
    
    // Update gear check with image URL
    const imageUrl = `/uploads/${req.file.filename}`;
    await gearCheck.update({
      image_url: imageUrl,
      status: 'pending'
    });
    
    res.json({
      status: 'pending',
      imageUrl
    });
  } catch (error) {
    console.error('Error uploading gear check:', error);
    res.status(500).json({ error: 'Failed to upload gear check' });
  }
});

// Approve gear check
router.post('/:userId/approve', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check permission
    if (!canAdminGearCheck(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { userId } = req.params;
    
    // Get latest gear check request
    const gearCheck = await GearCheck.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
    if (!gearCheck || gearCheck.status !== 'pending') {
      return res.status(400).json({ error: 'No pending gear check found' });
    }
    
    // Update gear check status
    await gearCheck.update({
      status: 'approved',
      reviewed_by: req.user.id
    });
    
    res.json({
      status: 'approved'
    });
  } catch (error) {
    console.error('Error approving gear check:', error);
    res.status(500).json({ error: 'Failed to approve gear check' });
  }
});

// Deny gear check
router.post('/:userId/deny', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check permission
    if (!canAdminGearCheck(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }
    
    // Get latest gear check request
    const gearCheck = await GearCheck.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
    if (!gearCheck || gearCheck.status !== 'pending') {
      return res.status(400).json({ error: 'No pending gear check found' });
    }
    
    // Update gear check status
    await gearCheck.update({
      status: 'denied',
      denial_reason: reason,
      reviewed_by: req.user.id
    });
    
    res.json({
      status: 'denied'
    });
  } catch (error) {
    console.error('Error denying gear check:', error);
    res.status(500).json({ error: 'Failed to deny gear check' });
  }
});

module.exports = router;