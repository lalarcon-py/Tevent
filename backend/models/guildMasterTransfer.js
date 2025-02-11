module.exports = (sequelize, DataTypes) => {
    const GuildMasterTransfer = sequelize.define('GuildMasterTransfer', {
      old_gm_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      new_gm_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      transferred_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  
    return GuildMasterTransfer;
  };