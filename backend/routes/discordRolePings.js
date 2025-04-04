// routes/discordRolePings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rolePingsController = require('../controllers/discordRolePingsController');

// Get all role ping configurations for a guild
router.get('/role-pings', auth, rolePingsController.getRolePings);

// Save role ping configurations for a guild
router.post('/role-pings', auth, rolePingsController.saveRolePings);

// Get all available roles from a Discord server
router.get('/roles', auth, rolePingsController.getDiscordRoles);

// Test role ping configurations by sending test messages
router.post('/test-role-pings', auth, rolePingsController.testRolePings);

module.exports = router;