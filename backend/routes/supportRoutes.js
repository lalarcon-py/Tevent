// backend/routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const supportController = require('../controllers/supportController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Routes
router.post('/submit', upload.array('files'), supportController.submitTicket);

module.exports = router;