const sequelize = require('../config/database');
const User = require('./User');
const Item = require('./Item');
const DKPTransaction = require('./DKPTransaction');
const LootRequest = require('./LootRequest');
const Event = require('./Event');
const EventParticipant = require('./EventParticipant');

// Set up relationships
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' });

Event.hasMany(EventParticipant, { foreignKey: 'event_id' });
EventParticipant.belongsTo(Event, { foreignKey: 'event_id' });

EventParticipant.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(EventParticipant, { foreignKey: 'user_id' });

const db = {
  sequelize,
  User,
  Item,
  DKPTransaction,
  LootRequest,
  Event,
  EventParticipant
};

// Initialize models
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

module.exports = db;