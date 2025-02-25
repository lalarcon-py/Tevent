// models/Attendance.js
module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {  // Changed from playerId to match User model
      type: DataTypes.UUID,
      references: {
        model: 'users',  // Reference your User model's table
        key: 'id'
      },
      allowNull: false
    },
    event_id: {  // Changed to snake_case
      type: DataTypes.UUID,
      references: {
        model: 'events',  // Reference your Event model's table
        key: 'id'
      },
      allowNull: false
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    dkp_earned: {  // Changed to snake_case
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'attendances',
    underscored: true
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'player'
    });
    Attendance.belongsTo(models.Event, {
      foreignKey: 'event_id',
      as: 'event'
    });
  };

  return Attendance;
};