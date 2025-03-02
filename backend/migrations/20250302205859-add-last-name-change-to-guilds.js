// migrations/xxxx-add-last-name-change-to-guilds.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guilds', 'last_name_change', {
      type: Sequelize.DATE,
      allowNull: true // Match your model's definition
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('guilds', 'last_name_change');
  }
};