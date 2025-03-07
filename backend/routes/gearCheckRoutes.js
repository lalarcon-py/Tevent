// backend/routes/gearCheckRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const gearCheckController = require('../controllers/gearCheckController');
const { GearCheck, User, GuildMember } = require('../models');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      // Accept any image file
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  });

// Request a gear check (admin only)
router.post('/request', gearCheckController.requestGearCheck);

// Upload a gear check
router.post('/upload', upload.single('image'), gearCheckController.uploadGearCheck);

// Approve a gear check (admin only)
router.post('/:gearCheckId/approve', gearCheckController.approveGearCheck);

// Deny a gear check (admin only)
router.post('/:gearCheckId/deny', gearCheckController.denyGearCheck);

// Get a user's gear check status
router.get('/user/:userId', gearCheckController.getUserGearCheckStatus);

// List all recent gear checks (admin only)
router.get('/', gearCheckController.listGearChecks);

module.exports = router;