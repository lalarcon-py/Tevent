const { DataTypes } = require('sequelize');

const User = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    // Add other fields as needed
  });

  return User;
};

module.exports = User;