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

// Routes
router.post('/', upload.single('screenshot'), guildApplicationController.submit);
router.get('/', guildApplicationController.getPendingApplications);
router.get('/waitlist', guildApplicationController.getWaitlistedApplications);
router.get('/my-application', guildApplicationController.getMyApplication);
router.post('/:applicationId/approve', guildApplicationController.approveApplication);
router.post('/:applicationId/deny', guildApplicationController.denyApplication);
router.post('/:applicationId/waitlist', guildApplicationController.waitlistApplication);
router.post('/:applicationId/notify', guildApplicationController.notifyWaitlistedApplicant);

module.exports = router;