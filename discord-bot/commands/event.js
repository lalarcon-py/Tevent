const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');
const { sequelize } = require('../../../config/database');

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

      if (subcommand === 'list') {
        try {
          const days = interaction.options.getInteger('days') || 7;
          
          // Sanitize input
          const safetyDays = Math.min(Math.max(1, days), 30); // Limit between 1 and 30
          
          const events = await database.getUpcomingEvents(guildId, safetyDays);
          
          if (!events || events.length === 0) {
            return interaction.reply('No upcoming events in the next ' + safetyDays + ' days.');
          }
          
          // Create embeds for each event (up to 10 - Discord limit)
          const embeds = [];
          
          for (const event of events.slice(0, 10)) {
            try {
              const embed = this.createEventEmbed(event);
              embeds.push(embed);
            } catch (embedError) {
              console.error('Error creating event embed:', embedError);
              // Continue with other embeds
            }
          }
          
          if (embeds.length === 0) {
            return interaction.reply('Error displaying event information. Please try again later.');
          }
          
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
            content: `Upcoming events in the next ${safetyDays} days:`,
            embeds: embeds,
            components: [row]
          });
        } catch (error) {
          console.error('Error fetching events:', error);
          await interaction.reply({
            content: 'An error occurred while fetching events.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'view') {
        try {
          const eventId = interaction.options.getString('id');
          const event = await database.getEventById(eventId);
          
          if (!event) {
            return interaction.reply({ 
              content: 'Event not found.',
              ephemeral: true
            });
          }
          
          const embed = this.createEventEmbed(event);
          
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
          try {
            const teams = await database.getEventTeams(eventId);
            const teamEmbeds = teams.map(team => embedBuilder.createTeamEmbed(team));
            
            await interaction.reply({ 
              content: 'Event details:',
              embeds: [embed, ...teamEmbeds],
              components: [row]
            });
          } catch (teamsError) {
            console.error('Error fetching teams:', teamsError);
            // Still reply with event details even if teams fail
            await interaction.reply({ 
              content: 'Event details (unable to fetch teams):',
              embeds: [embed],
              components: [row]
            });
          }
        } catch (error) {
          console.error('Error viewing event:', error);
          await interaction.reply({
            content: 'An error occurred while fetching the event details.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'signup') {
        try {
          const eventId = interaction.options.getString('id');
          const role = interaction.options.getString('role');
          const discordUserId = interaction.user.id;
          
          const result = await database.signUpForEvent(guildId, eventId, discordUserId, role);
          
          if (result.success) {
            await interaction.reply({ 
              content: `You have been signed up for the event as ${role}.`,
              ephemeral: true
            });
            
            // Refresh event in channel for everyone to see updated signup count
            try {
              const event = await database.getEventById(eventId);
              if (event) {
                const embed = this.createEventEmbed(event);
                
                await interaction.followUp({
                  content: 'Event signup updated:',
                  embeds: [embed]
                });
              }
            } catch (refreshError) {
              console.error('Error refreshing event details:', refreshError);
              // Continue without refresh
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
    } catch (error) {
      console.error('General event command error:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing the event command.',
        ephemeral: true
      });
    }
  },
  
  // Fixed helper method for event embed creation
  createEventEmbed: (event) => {
    try {
      // Convert event_time to Date if it's a string
      const eventTime = typeof event.event_time === 'string' 
        ? new Date(event.event_time) 
        : event.event_time;
      
      // Handle case where participants might be undefined
      const participants = event.participants || [];
      
      const tankCount = participants.filter(p => p.role === 'TANK').length || 0;
      const healerCount = participants.filter(p => p.role === 'HEALER').length || 0;
      const dpsCount = participants.filter(p => p.role === 'DPS').length || 0;
      
      const embed = new EmbedBuilder()
        .setTitle(`📅 ${event.title || 'Unnamed Event'}`)
        .setDescription(event.description || 'No description provided')
        .setColor('#3498db')
        .addFields(
          { name: '⏰ Time', value: eventTime.toLocaleString(), inline: false },
          { name: '📍 Location', value: event.location || 'Not specified', inline: false },
          { name: '🛡️ Tanks', value: `${tankCount}/${event.tanks || 0}`, inline: true },
          { name: '💚 Healers', value: `${healerCount}/${event.healers || 0}`, inline: true },
          { name: '⚔️ DPS', value: `${dpsCount}/${event.dps || 0}`, inline: true }
        )
        .setFooter({ text: `ID: ${event.id}` })
        .setTimestamp();
      
      return embed;
    } catch (error) {
      console.error('Error creating event embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Event Details')
        .setDescription('Error creating detailed event information')
        .setColor('#ff0000');
    }
  }
};