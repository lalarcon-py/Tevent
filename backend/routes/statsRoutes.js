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

router.get('/members', isAuthenticated, dashboardController.getMemberStats);
router.get('/combat', isAuthenticated, dashboardController.getCombatStats);
router.get('/attendance', isAuthenticated, dashboardController.getAttendanceStats);
router.get('/weapons', isAuthenticated, dashboardController.getWeaponStats);

module.exports = router;