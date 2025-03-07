// backend/migrations/20250310-fix-gear-checks-migrations.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table exists
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'gear_checks'
        )`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (!tableExists[0].exists) {
        console.log('gear_checks table does not exist, skipping migration');
        return;
      }
      
      // Check which columns already exist
      const columns = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'gear_checks'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      const columnNames = columns.map(c => c.column_name);
      
      // Only add columns that don't exist
      const columnsToAdd = [
        {
          name: 'guild_id',
          type: Sequelize.UUID,
          allowNull: true
        },
        {
          name: 'reviewed_by',
          type: Sequelize.UUID,
          allowNull: true
        },
        {
          name: 'denial_reason',
          type: Sequelize.TEXT,
          allowNull: true
        },
        {
          name: 'requested_by',
          type: Sequelize.UUID,
          allowNull: true
        }
      ];
      
      // Add each missing column
      for (const column of columnsToAdd) {
        if (!columnNames.includes(column.name)) {
          console.log(`Adding ${column.name} column`);
          await queryInterface.addColumn('gear_checks', column.name, column.type);
        } else {
          console.log(`Column ${column.name} already exists, skipping`);
        }
      }
      
    } catch (error) {
      console.error('Migration error:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Empty down migration to avoid errors
  }
};