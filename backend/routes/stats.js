// stats.js routes
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { Op } = require('sequelize');

// Get member stats
router.get('/members', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const dailyStats = await sequelize.query(`
      SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) as active_members,
        AVG(COUNT(*)) OVER (ORDER BY date_trunc('day', created_at) 
          ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as average_members
      FROM users
      WHERE created_at >= :sevenDaysAgo
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at)
    `, {
      replacements: { sevenDaysAgo },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({ dailyStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

