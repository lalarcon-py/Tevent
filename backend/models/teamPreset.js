// models/teamPreset.js
module.exports = (sequelize, DataTypes) => {
    const TeamPreset = sequelize.define('TeamPreset', {
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
      teams_data: {
        type: DataTypes.JSON,
        allowNull: false
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false
      }
    });
  
    return TeamPreset;
  };