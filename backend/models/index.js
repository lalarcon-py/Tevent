const sequelize = require('../config/database');
const User = require('./User');
const Item = require('./Item');
const DKPTransaction = require('./DKPTransaction');
const LootRequest = require('./LootRequest');

const db = {
  sequelize,
  User,
  Item,
  DKPTransaction,
  LootRequest
};

module.exports = db;