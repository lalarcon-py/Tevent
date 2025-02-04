module.exports = (sequelize, DataTypes) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    team_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
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
    tableName: 'team_members',
    timestamps: true,
    underscored: true
  });

  TeamMember.associate = (models) => {
    TeamMember.belongsTo(models.Team, { foreignKey: 'team_id' });
    TeamMember.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return TeamMember;
};