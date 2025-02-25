module.exports = (sequelize, DataTypes) => {
  const EventSignup = sequelize.define('EventSignup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('tank', 'healer', 'dps'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('signed', 'standby', 'attended', 'absent'),
      defaultValue: 'signed'
    },
    dkp_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'event_signups',
    underscored: true,
    timestamps: true
  });

  EventSignup.associate = (models) => {
    EventSignup.belongsTo(models.User, { foreignKey: 'user_id' });
    EventSignup.belongsTo(models.Event, { foreignKey: 'event_id' });
  };

  return EventSignup;
};