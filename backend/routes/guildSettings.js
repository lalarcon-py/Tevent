// backend/routes/guildSettings.js
const express = require('express');
const router = express.Router();
const guildSettingsController = require('../controllers/guildSettingsController');
const { deleteGuild } = require('../controllers/guildController');

// Get guild settings
router.get('/:guildId/settings', guildSettingsController.getGuildSettings);

// Update guild settings
router.put('/:guildId/settings', guildSettingsController.updateGuildSettings);

// Note: deleteGuild route is likely already defined in guildRoutes,
// so you may not need to add it here

module.exports = router;