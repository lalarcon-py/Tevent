// migrations/xxxx-add-guild-settings-columns.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guilds', 'dkp_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
    await queryInterface.addColumn('guilds', 'max_tanks', {
      type: Sequelize.INTEGER,
      defaultValue: 10,
      allowNull: false
    });
    await queryInterface.addColumn('guilds', 'max_healers', {
      type: Sequelize.INTEGER,
      defaultValue: 15,
      allowNull: false
    });
    await queryInterface.addColumn('guilds', 'max_dps', {
      type: Sequelize.INTEGER,
      defaultValue: 75,
      allowNull: false
    });
    await queryInterface.addColumn('guilds', 'min_attendance_threshold', {
      type: Sequelize.INTEGER,
      defaultValue: 60,
      allowNull: false
    });
    await queryInterface.addColumn('guilds', 'attendance_warning_message', {
      type: Sequelize.TEXT,
      defaultValue: 'You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown.',
      allowNull: false
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('guilds', 'dkp_enabled');
    await queryInterface.removeColumn('guilds', 'max_tanks');
    await queryInterface.removeColumn('guilds', 'max_healers');
    await queryInterface.removeColumn('guilds', 'max_dps');
    await queryInterface.removeColumn('guilds', 'min_attendance_threshold');
    await queryInterface.removeColumn('guilds', 'attendance_warning_message');
  }
};