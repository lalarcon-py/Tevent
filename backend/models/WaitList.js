// models/WaitList.js
const WaitList = sequelize.define('WaitList', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    playerId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Players',
        key: 'id'
      },
      allowNull: false
    },
    itemId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Items',
        key: 'id'
      },
      allowNull: false
    },
    requestDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    }
  });