'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN builds SET DEFAULT '{}'::jsonb[],
      ALTER COLUMN builds TYPE jsonb[] USING builds::jsonb[];
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN builds DROP DEFAULT,
      ALTER COLUMN builds TYPE text[];
    `);
  }
};