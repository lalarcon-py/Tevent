const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./config/database');

// Item Schema
const Item = sequelize.define('Item', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING },
    rarity: { type: DataTypes.ENUM('Common', 'Rare', 'Epic', 'Legendary') },
    dkpCost: { type: DataTypes.INTEGER, defaultValue: 0 },
    inStorage: { type: DataTypes.BOOLEAN, defaultValue: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    icon: { type: DataTypes.STRING }
}, {
    tableName: 'items',
    freezeTableName: true
});
  
// Loot Request Schema
const LootRequest = sequelize.define('LootRequest', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    status: { 
        type: DataTypes.ENUM('Pending', 'Approved', 'Denied', 'Fulfilled'),
        defaultValue: 'Pending'
    },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'loot_requests',
    freezeTableName: true
});
  
// DKP Transaction Schema
const DKPTransaction = sequelize.define('DKPTransaction', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT }
}, {
    tableName: 'DKPTransactions',
    freezeTableName: true
});

// User Schema
const User = sequelize.define('User', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    // add other user fields as needed
}, {
    tableName: 'Users',
    freezeTableName: true
});
  
// Associations
User.hasMany(LootRequest);
Item.hasMany(LootRequest);
User.hasMany(DKPTransaction);
LootRequest.belongsTo(User);
LootRequest.belongsTo(Item);

module.exports = {
    sequelize,
    Item,
    LootRequest,
    DKPTransaction,
    User
};