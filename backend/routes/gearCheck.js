const express = require('express');
const router = express.Router();
const { Item } = require('../models');
const { Op } = require('sequelize');

router.post('/verify', async (req, res) => {
  try {
    const itemNames = req.body.imageText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const verifiedItems = await Item.findAll({
      where: {
        name: {
          [Op.or]: itemNames.map(name => ({ [Op.iLike]: `%${name}%` }))
        }
      },
      order: [[sequelize.fn('similarity', sequelize.col('name'), name), 'DESC']]
    });

    res.json({ verifiedItems });
  } catch (error) {
    console.error('Gear check failed:', error);
    res.status(500).json({ error: 'Gear verification failed' });
  }
});

module.exports = router;