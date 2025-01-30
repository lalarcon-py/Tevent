// Item Schema
const Item = sequelize.define('Item', {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('Weapon', 'Armor', 'Accessory') },
    rarity: { type: DataTypes.ENUM('Common', 'Rare', 'Epic', 'Legendary') },
    dkpCost: { type: DataTypes.INTEGER, defaultValue: 0 },
    inStorage: { type: DataTypes.BOOLEAN, defaultValue: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 }
  });
  
  // Loot Request Schema
  const LootRequest = sequelize.define('LootRequest', {
    id: { type: DataTypes.UUID, primaryKey: true },
    status: { 
      type: DataTypes.ENUM('Pending', 'Approved', 'Denied', 'Fulfilled'),
      defaultValue: 'Pending'
    },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 }
  });
  
  // DKP Transaction Schema
  const DKPTransaction = sequelize.define('DKPTransaction', {
    id: { type: DataTypes.UUID, primaryKey: true },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT }
  });
  
  // Associations
  User.hasMany(LootRequest);
  Item.hasMany(LootRequest);
  User.hasMany(DKPTransaction);
  LootRequest.belongsTo(User);
  LootRequest.belongsTo(Item);