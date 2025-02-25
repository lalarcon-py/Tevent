const express = require('express');
const router = express.Router();
const { DKPTransaction } = require('../models');

router.post('/adjust', async (req, res) => {
  try {
    const { userId, amount, reason } = req.body; // Changed from memberId to userId
    const adjustment = await DKPTransaction.create({ 
      userId,
      amount, 
      reason,
      userId: req.user.id // Added auditor tracking
    });
    res.status(201).json(adjustment);
  } catch (error) {
    console.error('DKP adjustment error:', error);
    res.status(500).json({ error: 'DKP adjustment failed' });
  }
});

module.exports = router;