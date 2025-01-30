const express = require('express');
const router = express.Router();
const { query } = require('../services/db');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

router.post('/verify', async (req, res) => {
  try {
    // 1. Extract and validate items
    const itemNames = req.body.imageText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    // 2. Database verification
    const verifiedItems = [];
    for (const name of itemNames) {
      const { rows } = await query(
        `SELECT * FROM items 
         WHERE name % $1
         ORDER BY similarity(name, $1) DESC
         LIMIT 1`,
        [name]
      );
      if (rows.length > 0) verifiedItems.push(rows[0]);
    }

    // 3. Audit logging
    await query(
      `INSERT INTO gear_checks 
       (user_id, checked_items, check_date)
       VALUES ($1, $2, NOW())`,
      [req.user.id, verifiedItems.map(i => i.name)]
    );

    res.json({ verifiedItems });
  } catch (error) {
    console.error('Gear check failed:', error);
    res.status(500).json({ error: 'Gear verification failed' });
  }
});

module.exports = router;