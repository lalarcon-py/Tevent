module.exports = (sequelize, DataTypes) => {
  const WaitList = sequelize.define('WaitList', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    request_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'waitlists',
    underscored: true,
    timestamps: true
  });

  WaitList.associate = (models) => {
    WaitList.belongsTo(models.User, { foreignKey: 'user_id' });
    WaitList.belongsTo(models.Item, { foreignKey: 'item_id' });
  };

  return WaitList;
};