// models/Attendance.js
const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    playerId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Players',
        key: 'id'
      },
      allowNull: false
    },
    eventId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Events',
        key: 'id'
      },
      allowNull: false
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    dkpEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });