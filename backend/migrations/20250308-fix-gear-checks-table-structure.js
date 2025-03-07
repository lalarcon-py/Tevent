// backend/migrations/20250308-fix-gear-checks-table-structure.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, check if the table exists
      let tableExists = true;
      try {
        await queryInterface.describeTable('gear_checks');
      } catch (e) {
        tableExists = false;
      }
      
      // If table doesn't exist, create it with all required columns
      if (!tableExists) {
        await queryInterface.createTable('gear_checks', {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()')
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false
          },
          guild_id: {
            type: Sequelize.UUID,
            allowNull: false
          },
          image_url: {
            type: Sequelize.STRING(512),
            allowNull: true
          },
          status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'requested'
          },
          denial_reason: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          reviewed_by: {
            type: Sequelize.UUID,
            allowNull: true
          },
          requested_by: {
            type: Sequelize.UUID,
            allowNull: true
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        });
        console.log('Created gear_checks table from scratch');
        return;
      }
      
      // Table exists, check each column and add if missing
      const tableInfo = await queryInterface.describeTable('gear_checks');
      
      // Check and add guild_id if missing
      if (!tableInfo.guild_id) {
        await queryInterface.addColumn('gear_checks', 'guild_id', {
          type: Sequelize.UUID,
          allowNull: true // Make nullable for existing records
        });
        console.log('Added guild_id column');
      }
      
      // Check and add denial_reason if missing
      if (!tableInfo.denial_reason) {
        await queryInterface.addColumn('gear_checks', 'denial_reason', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        console.log('Added denial_reason column');
      }
      
      // Check and add reviewed_by if missing
      if (!tableInfo.reviewed_by) {
        await queryInterface.addColumn('gear_checks', 'reviewed_by', {
          type: Sequelize.UUID,
          allowNull: true
        });
        console.log('Added reviewed_by column');
      }
      
      // Check and add requested_by if missing
      if (!tableInfo.requested_by) {
        await queryInterface.addColumn('gear_checks', 'requested_by', {
          type: Sequelize.UUID,
          allowNull: true
        });
        console.log('Added requested_by column');
      }
      
      // Handle timestamp columns
      // If we have checked_at but no created_at, rename it
      if (!tableInfo.created_at && tableInfo.checked_at) {
        await queryInterface.renameColumn('gear_checks', 'checked_at', 'created_at');
        console.log('Renamed checked_at to created_at');
      } 
      // Otherwise add created_at if it's missing
      else if (!tableInfo.created_at) {
        await queryInterface.addColumn('gear_checks', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
        console.log('Added created_at column');
      }
      
      // Add updated_at if missing
      if (!tableInfo.updated_at) {
        await queryInterface.addColumn('gear_checks', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
        console.log('Added updated_at column');
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // The down migration is intentionally empty since reverting these changes
    // could result in data loss
    console.log('Down migration is not implemented for this migration');
  }
};