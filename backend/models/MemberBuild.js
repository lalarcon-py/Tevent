'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MemberBuild extends Model {
    static associate(models) {
      MemberBuild.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  MemberBuild.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    primary_weapon: {
      type: DataTypes.STRING,
      allowNull: false
    },
    secondary_weapon: {
      type: DataTypes.STRING,
      allowNull: false
    },
    combat_role: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'MemberBuild',
    tableName: 'memberbuilds',
    underscored: true,
    timestamps: true
  });

  return MemberBuild;
};