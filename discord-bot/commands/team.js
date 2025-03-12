const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');
const { sequelize } = require('../../../config/database');

async function ensureDatabaseConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Database connection error in command:', error);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('View team information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('event')
        .setDescription('View teams for an event')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Event ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific team')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Team ID')
            .setRequired(true)
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
      const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
      
      if (!guildId) {
        return interaction.reply({ 
          content: 'This Discord server is not linked to any guild.',
          ephemeral: true
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'event') {
        try {
          const eventId = interaction.options.getString('id');
          if (!eventId) {
            return interaction.reply({ 
              content: 'Please provide a valid event ID.',
              ephemeral: true
            });
          }
          
          const teams = await database.getEventTeams(eventId);
          
          if (!teams || teams.length === 0) {
            return interaction.reply('No teams found for this event.');
          }
          
          const embeds = [];
          
          // Create embeds for each team (up to 10 - Discord limit)
          for (const team of teams.slice(0, 10)) {
            try {
              const embed = this.createTeamEmbed(team);
              embeds.push(embed);
            } catch (embedError) {
              console.error('Error creating team embed:', embedError, team);
              // Continue with other teams
            }
          }
          
          if (embeds.length === 0) {
            return interaction.reply('Error displaying team information. Please try again later.');
          }
          
          await interaction.reply({ 
            content: `Teams for event ${eventId}:`,
            embeds: embeds
          });
        } catch (error) {
          console.error('Error fetching event teams:', error);
          await interaction.reply({
            content: 'An error occurred while fetching the teams.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'view') {
        try {
          const teamId = interaction.options.getString('id');
          if (!teamId) {
            return interaction.reply({ 
              content: 'Please provide a valid team ID.',
              ephemeral: true
            });
          }
          
          const team = await database.getTeamById(teamId);
          
          if (!team) {
            return interaction.reply({ 
              content: 'Team not found.',
              ephemeral: true
            });
          }
          
          let embed;
          try {
            embed = this.createTeamEmbed(team);
          } catch (embedError) {
            console.error('Error creating team embed:', embedError, team);
            return interaction.reply({
              content: 'Error displaying team information. Please try again later.',
              ephemeral: true
            });
          }
          
          await interaction.reply({ 
            content: 'Team details:',
            embeds: [embed]
          });
        } catch (error) {
          console.error('Error fetching team:', error);
          await interaction.reply({
            content: 'An error occurred while fetching the team details.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error('General team command error:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing the team command.',
        ephemeral: true
      });
    }
  },
  
  // Fixed helper method for team embed creation
  createTeamEmbed: (team) => {
    try {
      // Handle case where members might be undefined
      const members = team.members || [];
      
      const tanks = members.filter(m => m.role === 'TANK') || [];
      const healers = members.filter(m => m.role === 'HEALER') || [];
      const dps = members.filter(m => m.role === 'DPS') || [];
      
      const embed = new EmbedBuilder()
        .setTitle(`👥 Team: ${team.name || 'Unnamed Team'}`)
        .setColor('#2ecc71')
        .addFields(
          { 
            name: '🛡️ Tanks', 
            value: tanks.length > 0 ? 
              tanks.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
            inline: true 
          },
          { 
            name: '💚 Healers', 
            value: healers.length > 0 ? 
              healers.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
            inline: true 
          },
          { 
            name: '⚔️ DPS', 
            value: dps.length > 0 ? 
              dps.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
            inline: true 
          }
        )
        .setFooter({ text: `Team ID: ${team.id}` });
      
      return embed;
    } catch (error) {
      console.error('Error creating team embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Team Details')
        .setDescription('Error creating detailed team information')
        .setColor('#ff0000');
    }
  }
};