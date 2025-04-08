'use strict';

/**
 * Add applications channel type to the channel_type enum
 * This allows configuring a Discord channel for guild applications
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First check if the enum already has the applications type
      const [enumValues] = await queryInterface.sequelize.query(
        `SELECT 
          enum_range(NULL::channel_type_enum) as enum_values
        `
      );
      
      const currentValues = enumValues[0].enum_values.replace(/[{}]/g, '').split(',');
      
      if (!currentValues.includes('applications')) {
        // Add the new value to the enum type
        await queryInterface.sequelize.query(
          `ALTER TYPE channel_type_enum ADD VALUE IF NOT EXISTS 'applications'`
        );
        console.log('Added applications to channel_type_enum');
      } else {
        console.log('applications already exists in channel_type_enum');
      }
      
      // Create discord_application_messages table if it doesn't exist
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS discord_application_messages (
          id SERIAL PRIMARY KEY,
          guild_id UUID NOT NULL,
          application_id UUID NOT NULL,
          channel_id VARCHAR(30) NOT NULL,
          message_id VARCHAR(30) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(application_id)
        )
      `);
      console.log('Created or confirmed discord_application_messages table');
      
      return Promise.resolve();
    } catch (error) {
      // The enum might not exist yet, create a new one
      console.error('Error updating channel_type_enum:', error);
      try {
        // Check if the table exists first
        const [tableExists] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'discord_channel_configs'
          )`
        );
        
        if (tableExists[0].exists) {
          // Table exists but maybe no channel_type_enum
          // Create a new enum with all values
          await queryInterface.sequelize.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type_enum') THEN
                CREATE TYPE channel_type_enum AS ENUM ('events', 'storage', 'applications');
              END IF;
            END
            $$;
          `);
          console.log('Created channel_type_enum');
        } else {
          console.log('discord_channel_configs table does not exist yet, skipping');
        }
        
        return Promise.resolve();
      } catch (enumError) {
        console.error('Fatal error updating enum:', enumError);
        return Promise.reject(enumError);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Not directly removing an enum value as it's not supported in PostgreSQL
    // To remove, you need to create a new enum without the value and replace the old one
    return Promise.resolve();
  }
};