const { Item } = require('../models');

// Get all items (autocomplete)
const getAutocompleteItems = async (req, res) => {
  try {
    const items = await Item.findAll({
      attributes: ['id', 'name', 'icon'],
      order: [['name', 'ASC']],
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an item by ID
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { dkpCost, inStorage, quantity, icon } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.update({ dkpCost, inStorage, quantity, icon });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAutocompleteItems,
  updateItem,
};