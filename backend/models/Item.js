const { DataTypes } = require('sequelize');

const Item = (sequelize) => {
  const Item = sequelize.define('Item', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dkpCost: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });

  return Item;
};

module.exports = Item;