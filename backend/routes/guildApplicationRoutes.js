// backend/routes/guildApplicationRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const guildApplicationController = require('../controllers/guildApplicationController');
const { GuildApplication, User } = require('../models');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  },
});

// Debug route to check request parsing
router.get('/debug-request', (req, res) => {
  // This route returns information about how the request is parsed
  // Helpful for debugging issues with guildId
  res.json({
    guildId: {
      fromParams: req.params.guildId,
      fromQuery: req.query.guildId,
      fromRequestGuildId: req.guildId,
      fromBody: req.body.guildId
    },
    paramsKeys: Object.keys(req.params),
    queryKeys: Object.keys(req.query),
    bodyKeys: Object.keys(req.body || {}),
    headers: req.headers,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// Routes
router.post('/', upload.single('screenshot'), guildApplicationController.submit);
router.get('/', guildApplicationController.getPendingApplications);
router.get('/waitlist', guildApplicationController.getWaitlistedApplications);

// Updated route to allow passing guildId as a parameter
router.get('/my-application', guildApplicationController.getMyApplication);
// Add alternative route with explicit guildId parameter
router.get('/:guildId/my-application', guildApplicationController.getMyApplication);

// Add route to get a specific application by ID
router.get('/:applicationId', (req, res) => {
  const { applicationId } = req.params;
  const guildId = req.guildId || req.query.guildId;
  
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check guild ID
  if (!guildId) {
    return res.status(400).json({ error: 'Guild ID is required' });
  }
  
  // Find the application
  GuildApplication.findOne({
    where: { id: applicationId, guild_id: guildId },
    include: [{
      model: User,
      attributes: ['id', 'username', 'discord_id', 'avatar_url']
    }]
  })
  .then(application => {
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Return the application data
    return res.json(application);
  })
  .catch(error => {
    console.error('Error fetching application:', error);
    return res.status(500).json({ error: 'Failed to fetch application' });
  });
});

router.post('/:applicationId/approve', guildApplicationController.approveApplication);
router.post('/:applicationId/deny', guildApplicationController.denyApplication);
router.post('/:applicationId/waitlist', guildApplicationController.waitlistApplication);
router.post('/:applicationId/notify', guildApplicationController.notifyWaitlistedApplicant);

module.exports = router;