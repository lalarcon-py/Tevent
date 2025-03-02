// backend/models/WishList.js
module.exports = (sequelize, DataTypes) => {
    const WishList = sequelize.define('WishList', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
        allowNull: true,
        references: {
          model: 'items',
          key: 'id'
        }
      },
      item_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      item_type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'wishlists',
      underscored: true,
      timestamps: true
    });
  
    WishList.associate = (models) => {
      WishList.belongsTo(models.User, { foreignKey: 'user_id' });
      WishList.belongsTo(models.Item, { foreignKey: 'item_id' });
    };
  
    return WishList;
  };