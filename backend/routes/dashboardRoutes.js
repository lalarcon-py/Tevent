const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

router.get('/stats/members', isAuthenticated, dashboardController.getMemberStats);
router.get('/stats/combat', isAuthenticated, dashboardController.getCombatStats);
router.get('/stats/attendance', isAuthenticated, dashboardController.getAttendanceStats);
router.get('/stats/weapons', isAuthenticated, dashboardController.getWeaponStats);

module.exports = router;