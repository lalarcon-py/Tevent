// backend/utils/modelUtils.js
const { getCurrentGuildId } = require('./guildContext');

/**
 * Creates a guild-scoped Sequelize model
 * @param {object} sequelize - Sequelize instance
 * @param {class} ModelClass - The model class
 * @param {string} modelName - Name of the model
 * @param {object} attributes - Model attributes
 * @param {object} options - Additional model options
 * @returns {object} - The initialized model
 */
function createGuildScopedModel(sequelize, ModelClass, modelName, attributes, options = {}) {
  // Add guild_id to attributes if not present
  if (!attributes.guild_id) {
    attributes.guild_id = {
      type: sequelize.Sequelize.UUID,
      allowNull: false,
    };
  }

  // Initialize model with attributes and options
  const model = ModelClass.init(attributes, {
    ...options,
    sequelize,
    modelName,
    hooks: {
      ...options.hooks,
      beforeFind: async (findOptions) => {
        if (options.hooks?.beforeFind) {
          await options.hooks.beforeFind(findOptions);
        }

        const guildId = getCurrentGuildId();
        if (guildId) {
          findOptions.where = findOptions.where || {};
          findOptions.where.guild_id = guildId;
        }
      },
      beforeCreate: async (instance) => {
        if (options.hooks?.beforeCreate) {
          await options.hooks.beforeCreate(instance);
        }

        const guildId = getCurrentGuildId();
        if (guildId && !instance.guild_id) {
          instance.guild_id = guildId;
        }
      }
    }
  });

  return model;
}

module.exports = {
  createGuildScopedModel
};