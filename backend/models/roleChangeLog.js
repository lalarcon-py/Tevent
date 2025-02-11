module.exports = (sequelize, DataTypes) => {
    const RoleChangeLog = sequelize.define('RoleChangeLog', {
      member_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      old_role: {
        type: DataTypes.STRING,
        allowNull: false
      },
      new_role: {
        type: DataTypes.STRING,
        allowNull: false
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false
      },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  
    return RoleChangeLog;
  };