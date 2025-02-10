const { DataTypes } = require('sequelize');

const LootRequest = sequelize.define('LootRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  user_id: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  storage_item_id: {
    type: DataTypes.UUID,
    references: {
      model: 'guild_storage_items',
      key: 'id'
    }
  }
}, {
  tableName: 'loot_requests',
  timestamps: false
});

LootRequest.associate = (models) => {
  LootRequest.belongsTo(models.User);
  LootRequest.belongsTo(models.GuildStorageItem, {
    foreignKey: 'storage_item_id',
    as: 'StorageItem'
  });
};

module.exports = LootRequest;