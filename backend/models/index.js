const sequelize = require('../config/database');
const ItemModel = require('./Item');
const UserModel = require('./User');
const DKPTransactionModel = require('./DKPTransaction');
const LootRequestModel = require('./LootRequest');

// Initialize models
const Item = ItemModel(sequelize);
const User = UserModel(sequelize);
const DKPTransaction = DKPTransactionModel(sequelize);
const LootRequest = LootRequestModel(sequelize);

// Set up associations
// Add your associations here when you implement the other models
// Example: User.hasMany(DKPTransaction);

module.exports = {
  sequelize,
  Item,
  User,
  DKPTransaction,
  LootRequest
};