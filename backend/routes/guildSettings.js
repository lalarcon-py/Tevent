// backend/routes/guildSettings.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // Important: mergeParams: true
const guildSettingsController = require('../controllers/guildSettingsController');

// Routes should be relative to the mount point
router.get('/', guildSettingsController.getGuildSettings);
router.put('/', guildSettingsController.updateGuildSettings);
router.get('/direct-dkp-check', guildSettingsController.directDkpCheck);

module.exports = router;