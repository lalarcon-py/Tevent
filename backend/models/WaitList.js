const WaitList = sequelize.define('WaitList', {
  id: {
    type: DataTypes.UUID,        
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  playerId: {
    type: DataTypes.UUID,        
    references: {
      model: 'users',           
      key: 'id'
    },
    allowNull: false
  },
  storage_item_id: {            
    type: DataTypes.UUID,
    references: {
      model: 'guild_storage_items',
      key: 'id'
    },
    allowNull: false
  },
  requestDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Denied'),  
    defaultValue: 'Pending'
  },
  priority: {                    
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'loot_requests',
  underscored: true,
  timestamps: true
});

// Add associations
WaitList.associate = (models) => {
  WaitList.belongsTo(models.User, {
      foreignKey: 'playerId',
      as: 'User'
  });
  WaitList.belongsTo(models.GuildStorageItem, {
      foreignKey: 'storage_item_id',
      as: 'StorageItem'
  });
};