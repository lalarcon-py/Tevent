const User = require('./User');
const MemberBuild = require('./MemberBuild');
const Item = require('./Item');
const DKPTransaction = require('./DKPTransaction');
const LootRequest = require('./LootRequest');

function initModels(sequelize) {
  // Initialize associations
  User.hasMany(MemberBuild, {
    foreignKey: 'user_id',
    as: 'builds'
  });

  MemberBuild.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  return {
    User,
    MemberBuild,
    Item,
    DKPTransaction,
    LootRequest
  };
}

module.exports = initModels;