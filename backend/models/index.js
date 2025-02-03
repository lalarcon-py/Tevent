const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

console.log('Starting model initialization...');
console.log('Current directory:', __dirname);

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database, 
    config.username, 
    config.password, 
    config
  );
}

// Manually specify the models to load
const models = {
  Event: require('./Event'),
  EventParticipant: require('./EventParticipant'),
  User: require('./User'),
  Item: require('./Item'),
  LootRequest: require('./LootRequest'),
  DKPTransaction: require('./DKPTransaction')
};

// Initialize each model
Object.entries(models).forEach(([name, model]) => {
  console.log(`Initializing model: ${name}`);
  db[name] = model(sequelize, Sequelize.DataTypes);
});

// Set up associations
Object.values(db).forEach(model => {
  if (model.associate) {
    console.log(`Setting up associations for: ${model.name}`);
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('Available models after initialization:', Object.keys(db));

module.exports = db;