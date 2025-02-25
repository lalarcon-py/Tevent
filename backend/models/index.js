'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const config = require('../config/database');
const db = {};

const sequelize = config.sequelize;

console.log('🔎 Scanning models directory for valid model files...');

fs.readdirSync(__dirname)
  .filter(file => {
    const isValidModel = (
      file !== basename &&
      file.endsWith('.js') &&
      !file.includes('.test.js') // Exclude test files
    );
    console.log(`📁 ${file} - ${isValidModel ? 'VALID' : 'IGNORED'}`);
    return isValidModel;
  })
  .forEach(file => {
    try {
      console.log(`🔄 Attempting to load model from: ${file}`);
      const modelPath = path.join(__dirname, file);
      const modelModule = require(modelPath);
      
      // Validate the model file exports a function
      if (typeof modelModule !== 'function') {
        throw new Error(`❌ ${file} does not export a function (received ${typeof modelModule})`);
      }
      
      // Initialize the model
      const model = modelModule(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
      console.log(`✅ Successfully loaded model: ${model.name}`);
    } catch (error) {
      console.error(`💥 Critical error loading ${file}:`, error.message);
      console.error('🛑 Shutting down due to invalid model configuration');
      process.exit(1); // Exit with error code
    }
  });

console.log('🔗 Setting up model associations...');
Object.keys(db).forEach(modelName => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
    console.log(`➡️  Associated model: ${modelName}`);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('🎉 All models loaded successfully!');
console.log('📦 Exported models:', Object.keys(db));

module.exports = db;