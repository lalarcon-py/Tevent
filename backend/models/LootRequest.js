const { DataTypes } = require('sequelize');

const LootRequest = (sequelize) => {
  const LootRequest = sequelize.define('LootRequest', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    // Add other fields as needed
  });

  return LootRequest;
};

module.exports = LootRequest;