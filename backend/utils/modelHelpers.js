// backend/utils/modelHelpers.js
const { getCurrentGuildId } = require('./guildContext');

function addGuildScope(model, options = {}) {
  const originalOptions = model.options || {};
  const originalHooks = originalOptions.hooks || {};
  
  // Add hooks to automatically scope by guild_id
  const newHooks = {
    ...originalHooks,
    beforeFind: async (findOptions) => {
      if (originalHooks.beforeFind) {
        await originalHooks.beforeFind(findOptions);
      }
      
      const guildId = getCurrentGuildId();
      if (guildId) {
        findOptions.where = findOptions.where || {};
        findOptions.where.guild_id = guildId;
      }
    },
    beforeCreate: async (instance) => {
      if (originalHooks.beforeCreate) {
        await originalHooks.beforeCreate(instance);
      }
      
      const guildId = getCurrentGuildId();
      if (guildId && !instance.guild_id) {
        instance.guild_id = guildId;
      }
    }
  };
  
  // Update model options
  model.options = {
    ...originalOptions,
    hooks: newHooks
  };
  
  return model;
}

module.exports = { addGuildScope };