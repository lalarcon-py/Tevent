// backend/routes/dkp.js
const express = require('express');
const router = express.Router();
const { DKP } = require('../models');

router.post('/adjust', async (req, res) => {
  try {
    const { memberId, amount, reason } = req.body;
    const adjustment = await DKP.create({ memberId, amount, reason });
    res.status(201).json(adjustment);
  } catch (error) {
    res.status(500).json({ error: 'DKP adjustment failed' });
  }
});