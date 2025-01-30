const { DataTypes } = require('sequelize');

const DKPTransaction = (sequelize) => {
  const DKPTransaction = sequelize.define('DKPTransaction', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    // Add other fields as needed
  });

  return DKPTransaction;
};

module.exports = DKPTransaction;