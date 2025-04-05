// routes/discordRolePings.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const rolePingsController = require('../controllers/discordRolePingsController');

// Get all role ping configurations for a guild
router.get('/role-pings', authenticateJWT, rolePingsController.getRolePings);

// Save role ping configurations for a guild
router.post('/role-pings', authenticateJWT, rolePingsController.saveRolePings);

// Get all available roles from a Discord server
router.get('/roles', authenticateJWT, rolePingsController.getDiscordRoles);

// Test role ping configurations by sending test messages
router.post('/test-role-pings', authenticateJWT, rolePingsController.testRolePings);

module.exports = router;