const { SlashCommandBuilder } = require('@discordjs/builders');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');

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
    const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
    
    if (!guildId) {
      return interaction.reply({ 
        content: 'This Discord server is not linked to any guild.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'event') {
      const eventId = interaction.options.getString('id');
      const teams = await database.getEventTeams(eventId);
      
      if (teams.length === 0) {
        return interaction.reply('No teams found for this event.');
      }
      
      const embeds = teams.map(team => embedBuilder.createTeamEmbed(team));
      
      await interaction.reply({ 
        content: `Teams for event ${eventId}:`,
        embeds: embeds
      });
    }
    else if (subcommand === 'view') {
      const teamId = interaction.options.getString('id');
      const team = await database.getTeamById(teamId);
      
      if (!team) {
        return interaction.reply({ 
          content: 'Team not found.',
          ephemeral: true
        });
      }
      
      const embed = embedBuilder.createTeamEmbed(team);
      
      await interaction.reply({ 
        content: 'Team details:',
        embeds: [embed]
      });
    }
  },
};