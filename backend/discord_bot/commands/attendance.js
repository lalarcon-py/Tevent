// backend/discord_bot/commands/attendance.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Manage attendance for guild events')
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View attendance statistics for guild members')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mark')
        .setDescription('Mark attendance for an event')
        .addStringOption(option =>
          option.setName('event_id')
            .setDescription('Event ID')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Discord user to mark attendance for')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option.setName('attended')
            .setDescription('Whether the user attended the event')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('report')
        .setDescription('Generate an attendance report')
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Number of days to look back')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
    
    if (!guildId) {
      return interaction.reply({ 
        content: 'This Discord server is not linked to any guild.',
        ephemeral: true
      });
    }

    if (subcommand === 'stats') {
      try {
        const stats = await database.getAttendanceStats(guildId);
        const embed = embedBuilder.createAttendanceEmbed(stats);
        
        await interaction.reply({ 
          content: '📊 Attendance Statistics',
          embeds: [embed]
        });
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
        await interaction.reply({ 
          content: 'An error occurred while fetching attendance statistics.',
          ephemeral: true
        });
      }
    }
    else if (subcommand === 'mark') {
      const eventId = interaction.options.getString('event_id');
      const discordUser = interaction.options.getUser('user');
      const attended = interaction.options.getBoolean('attended');
      
      try {
        const user = await database.getUserByDiscordId(discordUser.id);
        if (!user) {
          return interaction.reply({
            content: `User ${discordUser.username} is not registered in the guild system.`,
            ephemeral: true
          });
        }
        
        const event = await database.getEventById(eventId);
        if (!event) {
          return interaction.reply({
            content: `Event with ID ${eventId} not found.`,
            ephemeral: true
          });
        }
        
        await database.updateEventAttendance(eventId, user.id, attended);
        
        await interaction.reply({ 
          content: `${attended ? '✅' : '❌'} Attendance for ${discordUser.username} has been marked as ${attended ? 'present' : 'absent'} for event "${event.title}".`,
          ephemeral: false
        });
      } catch (error) {
        console.error('Error marking attendance:', error);
        await interaction.reply({ 
          content: 'An error occurred while marking attendance.',
          ephemeral: true
        });
      }
    }
    else if (subcommand === 'report') {
      const days = interaction.options.getInteger('days') || 30;
      
      try {
        const stats = await database.getAttendanceStats(guildId, days);
        const embed = embedBuilder.createAttendanceEmbed(stats);
        
        await interaction.reply({ 
          content: `📊 Attendance Report for the last ${days} days`,
          embeds: [embed]
        });
      } catch (error) {
        console.error('Error generating attendance report:', error);
        await interaction.reply({ 
          content: 'An error occurred while generating the attendance report.',
          ephemeral: true
        });
      }
    }
  },
};