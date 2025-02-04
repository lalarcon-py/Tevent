module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define('Team', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'teams',
    timestamps: true,
    underscored: true
  });

  Team.associate = (models) => {
    Team.belongsTo(models.Event, { foreignKey: 'event_id' });
    Team.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Team.hasMany(models.TeamMember, { foreignKey: 'team_id', as: 'members' });
  };

  return Team;
};