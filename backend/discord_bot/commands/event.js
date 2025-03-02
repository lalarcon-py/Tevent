const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Manage guild events')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List upcoming events')
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Number of days to look ahead')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific event')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Event ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('signup')
        .setDescription('Sign up for an event')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Event ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('role')
            .setDescription('Your role')
            .setRequired(true)
            .addChoices(
              { name: 'Tank', value: 'TANK' },
              { name: 'Healer', value: 'HEALER' },
              { name: 'DPS', value: 'DPS' }
            )
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

    if (subcommand === 'list') {
      const days = interaction.options.getInteger('days') || 7;
      const events = await database.getUpcomingEvents(guildId, days);
      
      if (events.length === 0) {
        return interaction.reply('No upcoming events in the next ' + days + ' days.');
      }
      
      const embeds = events.map(event => embedBuilder.createEventEmbed(event));
      
      // Create signup buttons for first event
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`signup_${events[0].id}_TANK`)
            .setLabel('Sign up as Tank')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`signup_${events[0].id}_HEALER`)
            .setLabel('Sign up as Healer')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`signup_${events[0].id}_DPS`)
            .setLabel('Sign up as DPS')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.reply({ 
        content: `Upcoming events in the next ${days} days:`,
        embeds: embeds.slice(0, 10),
        components: [row]
      });
    }
    else if (subcommand === 'view') {
      const eventId = interaction.options.getString('id');
      const event = await database.getEventById(eventId);
      
      if (!event) {
        return interaction.reply({ 
          content: 'Event not found.',
          ephemeral: true
        });
      }
      
      const embed = embedBuilder.createEventEmbed(event);
      
      // Create signup buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`signup_${event.id}_TANK`)
            .setLabel('Sign up as Tank')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`signup_${event.id}_HEALER`)
            .setLabel('Sign up as Healer')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`signup_${event.id}_DPS`)
            .setLabel('Sign up as DPS')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Get teams for this event
      const teams = await database.getEventTeams(eventId);
      const teamEmbeds = teams.map(team => embedBuilder.createTeamEmbed(team));
      
      await interaction.reply({ 
        content: 'Event details:',
        embeds: [embed, ...teamEmbeds],
        components: [row]
      });
    }
    else if (subcommand === 'signup') {
      const eventId = interaction.options.getString('id');
      const role = interaction.options.getString('role');
      const discordUserId = interaction.user.id;
      
      try {
        const result = await database.signUpForEvent(guildId, eventId, discordUserId, role);
        
        if (result.success) {
          await interaction.reply({ 
            content: `You have been signed up for the event as ${role}.`,
            ephemeral: true
          });
          
          // Refresh event in channel for everyone to see updated signup count
          const event = await database.getEventById(eventId);
          if (event) {
            const embed = embedBuilder.createEventEmbed(event);
            
            await interaction.followUp({
              content: 'Event signup updated:',
              embeds: [embed]
            });
          }
        } else {
          await interaction.reply({ 
            content: result.message || 'Failed to sign up for the event.',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error signing up for event:', error);
        await interaction.reply({ 
          content: 'An error occurred while signing up for the event.',
          ephemeral: true
        });
      }
    }
  },
};