// filename: migrations/YYYYMMDDHHMMSS_add_event_signup_indexes.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For raw SQL execution through most migration frameworks
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add index for event_participants
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_participants_event_user ON event_participants(event_id, user_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_participants_role ON event_participants(role)',
        { transaction }
      );
      
      // Add index for event_absentees
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_absentees_event_id ON event_absentees(event_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_absentees_user_id ON event_absentees(user_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_event_absentees_event_user ON event_absentees(event_id, user_id)',
        { transaction }
      );
      
      // Add index for event_tentative (with safety check)
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'event_tentative'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_event_tentative_event_id ON event_tentative(event_id);
            CREATE INDEX IF NOT EXISTS idx_event_tentative_user_id ON event_tentative(user_id);
            CREATE INDEX IF NOT EXISTS idx_event_tentative_event_user ON event_tentative(event_id, user_id);
          END IF;
        END$$;`,
        { transaction }
      );
      
      // Optimize related tables
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_discord_guild_mappings_discord_id ON discord_guild_mappings(discord_guild_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_events_guild_id ON events(guild_id)',
        { transaction }
      );
      
      // Add ANALYZE to update statistics for query planner
      await queryInterface.sequelize.query('ANALYZE event_participants', { transaction });
      await queryInterface.sequelize.query('ANALYZE event_absentees', { transaction });
      await queryInterface.sequelize.query('ANALYZE discord_guild_mappings', { transaction });
      await queryInterface.sequelize.query('ANALYZE users', { transaction });
      await queryInterface.sequelize.query('ANALYZE events', { transaction });
      
      // Try to analyze event_tentative if it exists
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'event_tentative'
          ) THEN
            ANALYZE event_tentative;
          END IF;
        END$$;`,
        { transaction }
      );
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop indexes for event_participants
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_participants_event_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_participants_user_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_participants_event_user',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_participants_role',
        { transaction }
      );
      
      // Drop indexes for event_absentees
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_absentees_event_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_absentees_user_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_event_absentees_event_user',
        { transaction }
      );
      
      // Drop indexes for event_tentative with safety check
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'event_tentative'
          ) THEN
            DROP INDEX IF EXISTS idx_event_tentative_event_id;
            DROP INDEX IF EXISTS idx_event_tentative_user_id;
            DROP INDEX IF EXISTS idx_event_tentative_event_user;
          END IF;
        END$$;`,
        { transaction }
      );
      
      // Drop indexes for related tables
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_discord_guild_mappings_discord_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_users_discord_id',
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_events_guild_id',
        { transaction }
      );
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};