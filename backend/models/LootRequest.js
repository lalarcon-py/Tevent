// models/LootRequest.js
module.exports = (sequelize, DataTypes) => {
  const LootRequest = sequelize.define('LootRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storage_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'guild_storage_items',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Pending'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'loot_requests',
    timestamps: true
  });

  return LootRequest;
};