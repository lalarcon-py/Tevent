// backend/discord_bot/commands/attendance.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');
const { EventParticipant, EventAbsentee } = require('../../../models');
const { sequelize } = require('../../../config/database');

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

    if (!await ensureDatabaseConnection()) {
      return interaction.reply({ 
        content: 'Unable to connect to the database. Please try again later or contact the bot administrator.',
        ephemeral: true 
      });
    }

    try {
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
          
          if (!stats || stats.length === 0) {
            return interaction.reply('No attendance data found.');
          }
          
          const embed = this.createAttendanceEmbed(stats);
          
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
          // Find user by Discord ID
          const user = await database.getUserByDiscordId(discordUser.id);
          if (!user) {
            return interaction.reply({
              content: `User ${discordUser.username} is not registered in the guild system.`,
              ephemeral: true
            });
          }
          
          // Check if event exists
          const event = await database.getEventById(eventId);
          if (!event) {
            return interaction.reply({
              content: `Event with ID ${eventId} not found.`,
              ephemeral: true
            });
          }
          
          // Use the fixed updateEventAttendance method
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
        
        // Sanitize input
        const safetyDays = Math.min(Math.max(1, days), 90); // Limit between 1 and 90
        
        try {
          const stats = await database.getAttendanceStats(guildId, safetyDays);
          
          if (!stats || stats.length === 0) {
            return interaction.reply(`No attendance data found for the last ${safetyDays} days.`);
          }
          
          const embed = this.createAttendanceEmbed(stats);
          
          await interaction.reply({ 
            content: `📊 Attendance Report for the last ${safetyDays} days`,
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
    } catch (error) {
      console.error('General attendance command error:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing your attendance command.',
        ephemeral: true
      });
    }
  },
  
  // Helper method for attendance embed creation
  createAttendanceEmbed: (stats) => {
    try {
      // Ensure stats is an array
      if (!Array.isArray(stats)) {
        stats = [];
      }
      
      // Get total events
      const totalEvents = stats.length > 0 ? stats[0].total_events : 0;
      
      const embed = new EmbedBuilder()
        .setTitle('📊 Attendance Statistics')
        .setColor('#e74c3c')
        .setDescription(`Total events: ${totalEvents}`);
      
      // Top attendance (top 10)
      const topMembers = stats.slice(0, 10).map(s => 
        `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
      ).join('\n');
      
      if (topMembers) {
        embed.addFields({ name: '🏆 Top Attendance', value: topMembers || 'No data' });
      }
      
      // Members below threshold (if applicable)
      const lowAttendance = stats.filter(s => s.attendance_rate < 50).map(s =>
        `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
      ).join('\n');
      
      if (lowAttendance) {
        embed.addFields({ name: '⚠️ Low Attendance', value: lowAttendance });
      }
      
      return embed;
    } catch (error) {
      console.error('Error creating attendance embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Attendance Statistics')
        .setDescription('Error creating detailed attendance information')
        .setColor('#ff0000');
    }
  }
};