'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GearCheck extends Model {
    static associate(models) {
      GearCheck.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      GearCheck.belongsTo(models.User, { foreignKey: 'reviewed_by', as: 'reviewer' });
      // Note: We're not directly associating with Guild through a foreign key
      // But we'll use guild_id for filtering
    }
  }

  GearCheck.init({
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true 
    },
    guild_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('requested', 'pending', 'approved', 'denied'),
      defaultValue: 'pending'
    },
    denial_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    requested_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    guild_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'guilds',
          key: 'id'
        }
      },
  }, {
    sequelize,
    modelName: 'GearCheck',
    tableName: 'gear_checks',
    underscored: true,
    timestamps: true,
    scopes: {
      forGuild(guildId) {
        return {
          where: { guild_id: guildId }
        };
      },
      recent() {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        return {
          where: {
            created_at: {
              [sequelize.Sequelize.Op.gte]: fourteenDaysAgo
            }
          }
        };
      }
    }
  });

  return GearCheck;
};