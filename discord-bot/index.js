require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create client with necessary intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ] 
});

const API_URL = process.env.API_URL;

// Collection to store commands
client.commands = new Collection();

// Store guild mappings (Discord guild ID -> App guild ID)
const guildMappingsFile = path.join(__dirname, 'guild_mappings.json');
let guildMappings = {};

// Load guild mappings from file if it exists
if (fs.existsSync(guildMappingsFile)) {
  try {
    guildMappings = JSON.parse(fs.readFileSync(guildMappingsFile, 'utf8'));
    console.log('Loaded guild mappings:', Object.keys(guildMappings).length);
  } catch (error) {
    console.error('Error loading guild mappings:', error);
  }
}

// Function to save guild mappings
function saveGuildMappings() {
  try {
    fs.writeFileSync(guildMappingsFile, JSON.stringify(guildMappings, null, 2));
  } catch (error) {
    console.error('Error saving guild mappings:', error);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

// Member join handler
client.on('guildMemberAdd', async (member) => {
  const appGuildId = guildMappings[member.guild.id];
  if (!appGuildId) return; // Skip if no mapping exists
  
  try {
    // Login to get session cookie first
    const loginResponse = await axios.post(`${API_URL}/auth/bot-login`, {
      botSecret: process.env.BOT_SECRET // You'll need to create this endpoint
    });
    
    const cookies = loginResponse.headers['set-cookie'];

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

// Register slash commands
const registerCommands = async () => {
  try {
    // Commands structure
    const commands = [
      // Link command - only for server admins
      {
        name: 'link-guild',
        description: 'Link this Discord server to your application guild',
        options: [
          {
            name: 'guild_id',
            description: 'Your application Guild ID',
            type: 3, // STRING type
            required: true
          },
          {
            name: 'join_code',
            description: 'Your guild join code for verification',
            type: 3,
            required: true
          }
        ]
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
      }
    ];

    // Register commands with Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
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
    const loginResponse = await axios.post(`${API_URL}/auth/bot-login`, {
      botSecret: process.env.BOT_SECRET
    });
    return loginResponse.headers['set-cookie'];
  } catch (error) {
    console.error('Authentication error:', error);
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
    const appGuildId = guildMappings[discordGuildId];
    
    if (!appGuildId) {
      return await interaction.reply({ 
        content: 'This Discord server is not linked to an application guild. An admin needs to use /link-guild first.',
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
  if (!interaction.member.permissions.has('ADMINISTRATOR')) {
    return await interaction.reply({ 
      content: 'Only server administrators can link guilds.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  const guildId = interaction.options.getString('guild_id');
  const joinCode = interaction.options.getString('join_code');
  const discordGuildId = interaction.guild.id;
  
  try {
    // Authenticate
    const cookies = await getAuthSession();
    if (!cookies) {
      return await interaction.editReply('Authentication failed. Please contact the bot administrator.');
    }
    
    // Verify guild ID and join code
    const response = await axios.post(`${API_URL}/api/guilds/verify-join-code`, {
      guildId,
      joinCode
    }, {
      headers: { Cookie: cookies }
    });
    
    if (response.data.valid) {
      // Store the mapping
      guildMappings[discordGuildId] = guildId;
      saveGuildMappings();
      
      await interaction.editReply(`Successfully linked this Discord server to guild "${response.data.guildName}"!`);
    } else {
      await interaction.editReply('Invalid Guild ID or Join Code. Please try again.');
    }
  } catch (error) {
    console.error('Error linking guild:', error);
    await interaction.editReply('Failed to link guild. Make sure the Guild ID and Join Code are correct.');
  }
}

// Command handlers
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

// Implement the other command handlers similarly, passing appGuildId to each...
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

// Add implementations for the other command handlers...

// Initialize bot
client.login(process.env.DISCORD_BOT_TOKEN);