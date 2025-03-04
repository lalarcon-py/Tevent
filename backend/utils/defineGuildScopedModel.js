// utils/defineGuildScopedModel.js
function defineGuildScopedModel(sequelize, ModelClass, modelName, attributes, options = {}) {
  // Ensure guild_id is included
  const attributesWithGuildId = {
    ...attributes,
    guild_id: {
      type: sequelize.Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'guilds',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    ...attributes.guild_id && {} // Keep existing definition if present
  };
  
  // Add standard scopes
  const defaultScopes = {
    scopes: {
      ...(options.scopes || {}),
      forGuild(guildId) {
        return {
          where: {
            guild_id: guildId
          }
        };
      }
    }
  };
  
  // Combine options
  const mergedOptions = {
    ...options,
    ...defaultScopes
  };
  
  // Initialize model
  return ModelClass.init(attributesWithGuildId, mergedOptions);
}

module.exports = defineGuildScopedModel;