module.exports = (sequelize, DataTypes) => {
    const Event = sequelize.define('Event', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      description: DataTypes.TEXT,
      maxParticipants: {
        type: DataTypes.INTEGER,
        defaultValue: 40
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'cancelled'),
        defaultValue: 'scheduled'
      },
      dkpValue: {
        type: DataTypes.INTEGER,
        defaultValue: 10
      }
    });
    return Event;
  };