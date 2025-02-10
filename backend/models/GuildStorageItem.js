module.exports = (sequelize, DataTypes) => {
  const GuildStorageItem = sequelize.define('GuildStorageItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    item_id: {  // Keep this as item_id to match database
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    trait: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dkp_cost: {  // Keep using snake_case for consistency
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'guild_storage_items',
    underscored: true,
    timestamps: true
  });

  GuildStorageItem.associate = (models) => {
    GuildStorageItem.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'Item'
    });
  };

  return GuildStorageItem;
};