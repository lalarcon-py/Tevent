// backend/discord_bot/commands/check-connection.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check-connection')
    .setDescription('Check connection to the database'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      console.log('Running connection check for Discord guild:', interaction.guildId);
      
      // Test database connection
      const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
      
      if (!guildId) {
        await interaction.editReply('Database connection OK, but no guild mapping found for this Discord server.');
        return;
      }
      
      // Test a few more database queries
      try {
        // Check events access
        const upcomingEvents = await database.getUpcomingEvents(guildId, 7);
        const eventCount = upcomingEvents?.length || 0;
        
        // Check members access
        const members = await database.getMembers(guildId);
        const memberCount = members?.length || 0;
        
        await interaction.editReply(
          `✅ Connection successful!\n` +
          `- Guild ID: ${guildId}\n` +
          `- Upcoming events: ${eventCount}\n` +
          `- Guild members: ${memberCount}`
        );
      } catch (dataError) {
        console.error('Data access error:', dataError);
        await interaction.editReply(
          `✅ Basic connection successful, but error accessing data:\n${dataError.message}`
        );
      }
    } catch (error) {
      console.error('Connection check error:', error);
      await interaction.editReply(`❌ Connection failed: ${error.message}`);
    }
  }
};