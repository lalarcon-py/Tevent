// migrations/YYYYMMDDHHMMSS-add-join-code-to-guilds.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('guilds', 'join_code', {
      type: Sequelize.STRING(12),
      allowNull: true,
      unique: true
    });
    
    // Generate random join codes for existing guilds
    const guilds = await queryInterface.sequelize.query(
      'SELECT id FROM guilds',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    for (const guild of guilds) {
      const joinCode = generateRandomCode();
      await queryInterface.sequelize.query(
        'UPDATE guilds SET join_code = ? WHERE id = ?',
        { 
          replacements: [joinCode, guild.id],
          type: queryInterface.sequelize.QueryTypes.UPDATE
        }
      );
    }
    
    // Make join_code required after all existing guilds have one
    await queryInterface.changeColumn('guilds', 'join_code', {
      type: Sequelize.STRING(12),
      allowNull: false,
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('guilds', 'join_code');
  }
};

function generateRandomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}