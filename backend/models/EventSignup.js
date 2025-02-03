module.exports = (sequelize, DataTypes) => {
    const EventSignup = sequelize.define('EventSignup', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      playerId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      eventId: {
        type: DataTypes.INTEGER,
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
      dkpEarned: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    });
    return EventSignup;
  };
  module.exports = EventSignup;