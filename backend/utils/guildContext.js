// backend/utils/guildContext.js
const { AsyncLocalStorage } = require('async_hooks');

const guildContextStorage = new AsyncLocalStorage();
// Flag to indicate schema migration is in progress
let migrationMode = false;

const setGuildContext = (guildId, callback) => {
  return guildContextStorage.run({ guildId }, callback);
};

const getGuildContext = () => {
  return guildContextStorage.getStore();
};

const getCurrentGuildId = () => {
  if (migrationMode) return null;
  const context = getGuildContext();
  return context ? context.guildId : null;
};

// Enable/disable migration mode
const setMigrationMode = (enabled) => {
  migrationMode = enabled;
};

module.exports = {
  setGuildContext,
  getGuildContext,
  getCurrentGuildId,
  setMigrationMode
};