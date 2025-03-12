// discord-bot/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');



console.log('Environment Check:', {
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'missing',
  TOKEN: process.env.DISCORD_BOT_TOKEN || 'missing',
  TOKEN_LENGTH: process.env.DISCORD_BOT_TOKEN ? process.env.DISCORD_BOT_TOKEN.length : 0
});

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Log connection info
console.log("Database connection configured");

// Create client with necessary intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ] 
});

const API_URL = process.env.API_URL || 'https://tevent.app';

// Collection to store commands
client.commands = new Collection();

// Set up a small express server to receive webhook updates
const app = express();
const PORT = process.env.BOT_PORT || 3300;

app.use(bodyParser.json());

// Endpoint to update mappings from the main backend
app.post('/update-mapping', (req, res) => {
  const { discordGuildId, appGuildId, secret } = req.body;
  
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  console.log(`Received mapping update: Discord Guild ${discordGuildId} -> App Guild ${appGuildId}`);
  
  // You can store in memory for quick access if needed
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Bot webhook server running on port ${PORT}`);
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

// Handle when the bot joins a new server
client.on('guildCreate', async (guild) => {
  try {
    // Find the best channel to send welcome message
    const targetChannel = guild.systemChannel || 
                         guild.channels.cache.find(c => 
                           c.type === 0 && // TextChannel type
                           guild.members.me.permissionsIn(c).has('SendMessages')
                         );
    
    if (!targetChannel) return;
    
    // Get guild owner
    const owner = await guild.fetchOwner();
    
    // Create setup message with components
    const embed = new EmbedBuilder()
      .setTitle('Bot Setup')
      .setDescription(`Thanks for adding me to ${guild.name}! Let's link this server to your application guild.`)
      .addFields([
        { 
          name: 'Option 1: Quick Setup', 
          value: 'Use the button below to open a setup page where you can select your application guild.' 
        },
        { 
          name: 'Option 2: Manual Setup', 
          value: 'If you already know your guild ID and join code, use the `/link-guild` command.' 
        }
      ])
      .setColor('#4CAF50');
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_wizard')
          .setLabel('Setup Wizard')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setURL(`${process.env.FRONTEND_URL}/discord/setup?guildId=${guild.id}`)
          .setLabel('Quick Setup')
          .setStyle(ButtonStyle.Link)
      );
    
    await targetChannel.send({ 
      content: `<@${owner.id}>, please set up the bot to enable all features.`,
      embeds: [embed], 
      components: [row] 
    });
    
    // Also send a DM to the server owner
    try {
      await owner.send({ 
        content: `Hi! I was just added to your server **${guild.name}**. Please set up the bot to enable all features.`,
        embeds: [embed], 
        components: [row] 
      });
    } catch (dmError) {
      console.log('Could not send DM to owner, continuing anyway');
    }
  } catch (error) {
    console.error('Error in guildCreate handler:', error);
  }
});

// Member join handler
client.on('guildMemberAdd', async (member) => {
  try {
    // Get app guild ID from database
    const appGuildId = await getGuildMapping(member.guild.id);
    if (!appGuildId) return; // Skip if no mapping exists
    
    // Login to get session cookie
    const loginResponse = await axios.post(`${API_URL}/api/auth/bot-login`, {
      botSecret: process.env.BOT_SECRET
    });
    
    if (!loginResponse.data.success) {
      console.error('Bot login failed');
      return;
    }
    
    const cookies = loginResponse.headers['set-cookie'];
    
    // Add the user to the application guild
    await axios.post(`${API_URL}/api/users`, {
      discordId: member.id,
      username: member.user.username,
      role: 'Guild Member',
      guildId: appGuildId
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log(`User ${member.user.username} added to guild ${appGuildId}!`);
  } catch (error) {
    console.error('Error adding new user:', error);
  }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'setup_wizard') {
    // Respond with the setup link
    const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}`;
    
    await interaction.reply({
      content: `Click the link below to connect this Discord server to your application guild:`,
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setURL(setupUrl)
              .setLabel('Open Setup Page')
              .setStyle(ButtonStyle.Link)
          )
      ],
      ephemeral: true
    });
  }
});

// Register slash commands
const registerCommands = async () => {
  try {
    // Commands structure
    const commands = [
      // Link command - only for server admins
      {
        name: 'link-guild',
        description: 'Link this Discord server to your application guild',
        options: []
      },
      // Storage commands
      {
        name: 'storage',
        description: 'View guild storage',
        options: [
          {
            name: 'item',
            description: 'Search for a specific item',
            type: 3,
            required: false
          }
        ]
      },
      // Event commands
      {
        name: 'events',
        description: 'View upcoming events',
        options: [
          {
            name: 'id',
            description: 'Get details for a specific event by ID',
            type: 3,
            required: false
          }
        ]
      },
      {
        name: 'event-signup',
        description: 'Sign up for an event',
        options: [
          {
            name: 'event_id',
            description: 'Event ID',
            type: 3,
            required: true
          },
          {
            name: 'role',
            description: 'Your role in the event',
            type: 3,
            required: true,
            choices: [
              { name: 'Tank', value: 'TANK' },
              { name: 'Healer', value: 'HEALER' },
              { name: 'DPS', value: 'DPS' }
            ]
          }
        ]
      },
      // Teams commands
      {
        name: 'teams',
        description: 'View teams for an event',
        options: [
          {
            name: 'event_id',
            description: 'Event ID',
            type: 3,
            required: true
          }
        ]
      },
      // Members command
      {
        name: 'members',
        description: 'View guild members',
        options: []
      },
      {
        name: 'check-connection',
        description: 'Check if this Discord server is connected to a guild',
        options: []
      },
    ];

    const CLIENT_ID = '1333905158496587816';

    // Register commands with Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

// Helper function to authenticate and get a session
async function getAuthSession() {
  try {
    // Force IPv4 and ensure correct endpoint path
    const loginResponse = await axios.post(`${API_URL}/api/auth/bot-login`, {
      botSecret: process.env.BOT_SECRET
    }, {
      httpAgent: new require('http').Agent({ family: 4 }),
      httpsAgent: new require('https').Agent({ family: 4 })
    });
    return loginResponse.headers['set-cookie'];
  } catch (error) {
    console.error('Authentication error:', error.message);
    return null;
  }
}

// Helper function to get the app guild ID from a Discord guild ID
async function getGuildMapping(discordGuildId) {
  try {
    console.log(`Checking mapping for Discord guild: ${discordGuildId}`);
    
    // Query the database directly instead of going through API
    try {
      const result = await pool.query(
        'SELECT discord_guild_id, app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
        [discordGuildId.toString()]
      );
      
      if (result.rows && result.rows.length > 0) {
        console.log('Direct database mapping found:', result.rows[0]);
        return result.rows[0].app_guild_id;
      } else {
        console.log('No mapping found in database');
      }
    } catch (dbError) {
      console.error('Database query error:', dbError.message);
    }
    
    // API fallback is too unreliable with IPv6 issues, so we'll skip it
    return null;
  } catch (error) {
    console.error('Error getting guild mapping:', error.message);
    return null;
  }
}

// Slash command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName, options } = interaction;
    
    // Handle link-guild command (special case)
    if (commandName === 'link-guild') {
      await handleLinkGuildCommand(interaction);
      return;
    }
    
    // For all other commands, check if this Discord server is linked
    const discordGuildId = interaction.guild.id;
    const appGuildId = await getGuildMapping(discordGuildId);
    
    if (!appGuildId) {
      return await interaction.reply({ 
        content: 'This Discord server is not linked to an application guild. An admin needs to use the setup process.',
        ephemeral: true 
      });
    }
    
    // Handle other commands
    if (commandName === 'storage') {
      await handleStorageCommand(interaction, appGuildId);
    }
    else if (commandName === 'events') {
      await handleEventsCommand(interaction, appGuildId);
    }
    else if (commandName === 'event-signup') {
      await handleEventSignupCommand(interaction, appGuildId);
    }
    else if (commandName === 'teams') {
      await handleTeamsCommand(interaction, appGuildId);
    }
    else if (commandName === 'members') {
      await handleMembersCommand(interaction, appGuildId);
    }
    else if (commandName === 'check-connection') {
      await interaction.deferReply();
      
      try {
        const discordGuildId = interaction.guild.id;
        console.log(`Running connection check for Discord guild: ${discordGuildId}`);
        
        // First try direct database check
        const appGuildId = await getGuildMapping(discordGuildId);
        
        if (appGuildId) {
          await interaction.editReply({
            content: `✅ **Connection Success!**\nThis Discord server is connected to guild ID: \`${appGuildId}\``
          });
        } else {
          await interaction.editReply({
            content: `❌ **Not Connected**\nThis Discord server (ID: ${discordGuildId}) is not connected to any guild yet.\n\nAn admin needs to complete the connection setup.`
          });
        }
      } catch (error) {
        console.error('Check connection error:', error);
        await interaction.editReply(`❌ **Error Checking Connection**\n${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error handling command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'There was an error executing this command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
  }
});

// Link guild command handler
async function handleLinkGuildCommand(interaction) {
  // Only server admins can use this command
  if (!interaction.member.permissions.has('Administrator')) {
    return await interaction.reply({ 
      content: 'Only server administrators can link guilds.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  // Generate a web setup URL instead of requiring manual parameters
  const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}`;
  
  await interaction.editReply({
    content: `Click the link below to connect this Discord server to your guild:`,
    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setURL(setupUrl)
            .setLabel('Setup Connection')
            .setStyle(ButtonStyle.Link)
        )
    ]
  });
}

// Command handlers for other commands
async function handleStorageCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const searchQuery = interaction.options.getString('item');
    
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    const response = await axios.get(`${API_URL}/api/guild-storage/items?guildId=${appGuildId}`, {
      headers: { Cookie: cookies }
    });
    
    let items = response.data;
    
    // Filter by search query if provided
    if (searchQuery) {
      items = items.filter(item => 
        item.Item?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Create embeds for items (max 10 items per page)
    const embeds = [];
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      const embed = new EmbedBuilder()
        .setTitle(item.Item?.name || 'Unknown Item')
        .setDescription(`Quantity: ${item.quantity}`)
        .addFields(
          { name: 'Type', value: item.Item?.type || 'Unknown', inline: true },
          { name: 'DKP Cost', value: `${item.dkp_cost || 0}`, inline: true }
        )
        .setColor('#0099ff');
      
      if (item.trait) {
        embed.addFields({ name: 'Trait', value: item.trait, inline: true });
      }
      
      if (item.Item?.icon) {
        embed.setThumbnail(item.Item.icon);
      }
      
      embeds.push(embed);
    }
    
    if (embeds.length === 0) {
      await interaction.editReply('No items found in storage.');
    } else {
      await interaction.editReply({ 
        content: `Found ${items.length} items in guild storage:`,
        embeds: embeds
      });
    }
  } catch (error) {
    console.error('Error fetching storage:', error);
    await interaction.editReply('Failed to fetch guild storage items.');
  }
}

async function handleEventsCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const eventId = interaction.options.getString('id');
    
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    const response = await axios.get(`${API_URL}/api/events?guildId=${appGuildId}`, {
      headers: { Cookie: cookies }
    });
    
    let events = response.data;
    
    // If specific event ID is requested
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (!event) {
        return await interaction.editReply('Event not found.');
      }
      
      const embed = createEventEmbed(event);
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Filter to upcoming events only
    const now = new Date();
    events = events.filter(event => new Date(event.event_time) > now)
                   .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
                   .slice(0, 5); // Show next 5 events
    
    if (events.length === 0) {
      await interaction.editReply('No upcoming events found.');
      return;
    }
    
    const embeds = events.map(event => createEventEmbed(event));
    
    await interaction.editReply({ 
      content: 'Upcoming events:',
      embeds: embeds
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    await interaction.editReply('Failed to fetch events.');
  }
}

function createEventEmbed(event) {
  // Count participants by role
  const tankCount = event.participants?.filter(p => p.role === 'TANK').length || 0;
  const healerCount = event.participants?.filter(p => p.role === 'HEALER').length || 0;
  const dpsCount = event.participants?.filter(p => p.role === 'DPS').length || 0;
  
  // Format event time
  const eventDate = new Date(event.event_time);
  const dateString = eventDate.toLocaleDateString();
  const timeString = eventDate.toLocaleTimeString();
  
  return new EmbedBuilder()
    .setTitle(event.title)
    .setDescription(event.description || 'No description provided')
    .addFields(
      { name: 'Date', value: dateString, inline: true },
      { name: 'Time', value: timeString, inline: true },
      { name: 'Location', value: event.location || 'Not specified', inline: true },
      { name: 'Tanks', value: `${tankCount}/${event.tanks}`, inline: true },
      { name: 'Healers', value: `${healerCount}/${event.healers}`, inline: true },
      { name: 'DPS', value: `${dpsCount}/${event.dps}`, inline: true },
      { name: 'Event ID', value: event.id, inline: false }
    )
    .setColor('#00cc99')
    .setFooter({ text: `Use /event-signup to sign up - Event ID: ${event.id}` });
}

async function handleEventSignupCommand(interaction, appGuildId) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const eventId = interaction.options.getString('event_id');
    const role = interaction.options.getString('role');
    
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    // First, check if the event exists
    const eventResponse = await axios.get(`${API_URL}/api/events?guildId=${appGuildId}`, {
      headers: { Cookie: cookies }
    });
    
    const event = eventResponse.data.find(e => e.id === eventId);
    if (!event) {
      return await interaction.editReply(`Event with ID ${eventId} not found.`);
    }
    
    // Sign up for the event
    await axios.post(`${API_URL}/api/events/${eventId}/signup`, {
      role,
      guildId: appGuildId,
      userId: interaction.user.id
    }, {
      headers: { Cookie: cookies }
    });
    
    await interaction.editReply(`You've been signed up for "${event.title}" as ${role}.`);
  } catch (error) {
    console.error('Error signing up for event:', error);
    
    let errorMessage = 'Failed to sign up for the event.';
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error;
    }
    
    await interaction.editReply(errorMessage);
  }
}

async function handleTeamsCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const eventId = interaction.options.getString('event_id');
    
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    // Get teams for this event
    const teamsResponse = await axios.get(`${API_URL}/api/teams/event/${eventId}?guildId=${appGuildId}`, {
      headers: { Cookie: cookies }
    });
    
    const teams = teamsResponse.data;
    
    if (!teams || teams.length === 0) {
      return await interaction.editReply('No teams found for this event.');
    }
    
    // Create an embed for each team
    const embeds = teams.map(team => {
      const embed = new EmbedBuilder()
        .setTitle(team.name)
        .setDescription(`Members: ${team.members?.length || 0}`);
      
      // Add team member details
      if (team.members && team.members.length > 0) {
        const tankMembers = team.members.filter(m => m.role === 'TANK');
        const healerMembers = team.members.filter(m => m.role === 'HEALER');
        const dpsMembers = team.members.filter(m => m.role === 'DPS');
        
        if (tankMembers.length > 0) {
          embed.addFields({
            name: 'Tanks',
            value: tankMembers.map(m => m.User?.username || m.username).join('\n')
          });
        }
        
        if (healerMembers.length > 0) {
          embed.addFields({
            name: 'Healers',
            value: healerMembers.map(m => m.User?.username || m.username).join('\n')
          });
        }
        
        if (dpsMembers.length > 0) {
          embed.addFields({
            name: 'DPS',
            value: dpsMembers.map(m => m.User?.username || m.username).join('\n')
          });
        }
      }
      
      return embed;
    });
    
    await interaction.editReply({
      content: `Teams for event ID ${eventId}:`,
      embeds: embeds.slice(0, 10) // Discord limits to 10 embeds
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    await interaction.editReply('Failed to fetch teams for this event.');
  }
}

async function handleMembersCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    // Get guild members
    const membersResponse = await axios.get(`${API_URL}/api/guilds/${appGuildId}/members`, {
      headers: { Cookie: cookies }
    });
    
    const members = membersResponse.data;
    
    if (!members || members.length === 0) {
      return await interaction.editReply('No members found for this guild.');
    }
    
    // Group members by role
    const guildMasters = members.filter(m => m.role === 'Guild Master');
    const advisors = members.filter(m => m.role === 'Guild Advisor');
    const guardians = members.filter(m => m.role === 'Guild Guardian');
    const regularMembers = members.filter(m => !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(m.role));
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Guild Members')
      .setDescription(`Total members: ${members.length}`);
    
    if (guildMasters.length > 0) {
      embed.addFields({
        name: 'Guild Masters',
        value: guildMasters.map(m => m.username).join('\n')
      });
    }
    
    if (advisors.length > 0) {
      embed.addFields({
        name: 'Guild Advisors',
        value: advisors.map(m => m.username).join('\n')
      });
    }
    
    if (guardians.length > 0) {
      embed.addFields({
        name: 'Guild Guardians',
        value: guardians.map(m => m.username).join('\n')
      });
    }
    
    // Regular members (limited to prevent overflow)
    if (regularMembers.length > 0) {
      embed.addFields({
        name: 'Guild Members',
        value: regularMembers.slice(0, 20).map(m => m.username).join('\n') + 
               (regularMembers.length > 20 ? `\n...and ${regularMembers.length - 20} more` : '')
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching guild members:', error);
    await interaction.editReply('Failed to fetch guild members.');
  }
}

// Initialize bot
client.login(process.env.DISCORD_BOT_TOKEN);