// utils/guildContext.js
let currentGuildId = null;

// Store guild ID in context
const setGuildContext = (guildId, callback) => {
  // Just store the guild ID, no schema switching
  currentGuildId = guildId;
  
  if (typeof callback === 'function') {
    callback();
  }
  
  return guildId;
};

// Get current guild ID from context
const getCurrentGuildId = () => {
  return currentGuildId;
};

// Clear guild context
const clearGuildContext = () => {
  currentGuildId = null;
};

module.exports = {
  setGuildContext,
  getCurrentGuildId,
  clearGuildContext
};