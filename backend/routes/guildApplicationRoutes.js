// backend/routes/guildApplicationRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const guildApplicationController = require('../controllers/guildApplicationController');

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

router.post('/:applicationId/approve', guildApplicationController.approveApplication);
router.post('/:applicationId/deny', guildApplicationController.denyApplication);
router.post('/:applicationId/waitlist', guildApplicationController.waitlistApplication);
router.post('/:applicationId/notify', guildApplicationController.notifyWaitlistedApplicant);

module.exports = router;