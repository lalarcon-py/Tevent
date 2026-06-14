'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "session";`);
  }
};