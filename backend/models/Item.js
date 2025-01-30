module.exports = (sequelize, DataTypes) => {
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
      },
      inStorage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      icon: {
        type: DataTypes.STRING
      }
    });
  
    return Item;
  };