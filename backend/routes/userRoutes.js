const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Update user email
router.put('/email', userController.updateEmail);

// Upload gear screenshot
router.post('/gear-screenshot', upload.single('gearImage'), userController.uploadGearScreenshot);

module.exports = router;