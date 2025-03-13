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

// Test database connection
pool.query('SELECT NOW()')
  .then(result => console.log("Database connection successful, server time:", result.rows[0].now))
  .catch(err => console.error("Database connection error:", err));

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

const API_URL = process.env.BACKEND_URL || 'https://tevent.app';

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
      botSecret: process.env.DISCORD_CLIENT_SECRET
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
    // Try token-based authentication first
    try {
      console.log('Attempting token authentication');
      const tokenResponse = await axios.post(`${API_URL}/auth/bot-token`, {
        botSecret: process.env.DISCORD_CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        httpAgent: new require('http').Agent({ family: 4 }),
        httpsAgent: new require('https').Agent({ family: 4 })
      });
      
      if (tokenResponse.data && tokenResponse.data.token) {
        console.log('Token authentication successful');
        return ['Authorization=Bearer ' + tokenResponse.data.token];
      }
    } catch (tokenError) {
      console.log('Token auth failed, trying session auth:', tokenError.message);
    }
    
    // Fall back to session-based authentication
    console.log('Sending bot login request with data:', JSON.stringify({ botSecret: 'REDACTED' }));
    const loginResponse = await axios.post(`${API_URL}/auth/bot-login`, {
      botSecret: process.env.DISCORD_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpAgent: new require('http').Agent({ family: 4 }),
      httpsAgent: new require('https').Agent({ family: 4 })
    });
    
    console.log('Login response received:', loginResponse.status);
    return loginResponse.headers['set-cookie'];
  } catch (error) {
    console.error('Authentication error:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
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

// Slash command and interaction handler
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle different interaction types
    if (interaction.isCommand()) {
      const { commandName, options } = interaction;
      
      // Handle link-guild command (special case)
      if (commandName === 'link-guild') {
        await handleLinkGuildCommand(interaction);
        return;
      }
      
      // Handle setup command (special case)
      if (commandName === 'setup') {
        await handleSetupCommand(interaction);
        return;
      }
      
      // Handle help command (no guild required)
      if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('Tevent Guild Management Bot')
          .setColor('#90caf9')
          .setDescription('Manage your Tevent guild directly from Discord')
          .addFields([
            { name: '/setup', value: 'Link this Discord server to your Tevent guild (Admin only)' },
            { name: '/storage', value: 'Display items in the guild storage' },
            { name: '/events', value: 'View upcoming events' },
            { name: '/event-signup', value: 'Sign up for an event' },
            { name: '/teams', value: 'View teams for an event' },
            { name: '/members', value: 'View guild members' },
            { name: '/help', value: 'Show this help message' }
          ])
          .setFooter({ text: 'Tevent.app - Guild Management Made Easy' });
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      // For all other commands, check if this Discord server is linked
      const discordGuildId = interaction.guild?.id;
      
      if (!discordGuildId) {
        return await interaction.reply({ 
          content: 'This command must be used in a Discord server.',
          ephemeral: true 
        });
      }
      
      // Get linked guild ID from database
      const appGuildId = await getGuildMapping(discordGuildId);
      
      if (!appGuildId) {
        return await interaction.reply({ 
          content: 'This Discord server is not linked to an application guild. An admin needs to use the `/setup` command first.',
          ephemeral: true 
        });
      }
      
      // Handle commands with direct DB access
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
          console.log(`Running connection check for Discord guild: ${discordGuildId}`);
          
          // First try direct database check
          if (appGuildId) {
            // Check if guild exists
            const guildResult = await pool.query(
              'SELECT id, name, created_at FROM guilds WHERE id = $1',
              [appGuildId]
            );
            
            if (guildResult.rows && guildResult.rows.length > 0) {
              const guild = guildResult.rows[0];
              const createdDate = new Date(guild.created_at).toLocaleDateString();
              
              // Count members
              const memberCountResult = await pool.query(
                'SELECT COUNT(*) as count FROM guild_members WHERE guild_id = $1',
                [appGuildId]
              );
              
              const memberCount = memberCountResult.rows[0].count;
              
              await interaction.editReply({
                content: `✅ **Connection Success!**\n\nDiscord Server: \`${interaction.guild.name}\`\nLinked Guild: \`${guild.name}\`\nGuild ID: \`${appGuildId}\`\nCreated: ${createdDate}\nMembers: ${memberCount}`
              });
            } else {
              await interaction.editReply({
                content: `⚠️ **Partial Connection**\n\nThis Discord server is mapped to guild ID \`${appGuildId}\`, but that guild no longer exists in the database.`
              });
            }
          } else {
            await interaction.editReply({
              content: `❌ **Not Connected**\nThis Discord server (ID: ${discordGuildId}) is not connected to any guild yet.\n\nAn admin needs to complete the connection setup using \`/setup\`.`
            });
          }
        } catch (error) {
          console.error('Check connection error:', error);
          await interaction.editReply(`❌ **Error Checking Connection**\n${error.message}`);
        }
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      const customId = interaction.customId;
      
      // Handle setup wizard button
      if (customId === 'setup_wizard') {
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
        return;
      }
      
      // Handle loot approval/denial buttons
      if (customId.startsWith('approve_loot_') || customId.startsWith('deny_loot_')) {
        const requestId = customId.replace(/^(approve_loot_|deny_loot_)/, '');
        const isApprove = customId.startsWith('approve_loot_');
        
        // Check guild mapping first
        const discordGuildId = interaction.guild?.id;
        if (!discordGuildId) {
          return await interaction.reply({
            content: 'This button must be used in a Discord server.',
            ephemeral: true
          });
        }
        
        const appGuildId = await getGuildMapping(discordGuildId);
        if (!appGuildId) {
          return await interaction.reply({
            content: 'This Discord server is not linked to an application guild.',
            ephemeral: true
          });
        }
        
        await interaction.deferReply();
        
        try {
          // Get request details first
          const requestResult = await pool.query(
            `SELECT lr.*, 
                  gsi.quantity, 
                  i.name as item_name,
                  u.username, u.discord_id
            FROM loot_requests lr
            JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
            JOIN items i ON gsi.item_id = i.id
            JOIN users u ON lr.user_id = u.id
            WHERE lr.id = $1 AND lr.guild_id = $2`,
            [requestId, appGuildId]
          );
          
          if (!requestResult.rows || requestResult.rows.length === 0) {
            return await interaction.editReply('Request not found or already processed.');
          }
          
          const request = requestResult.rows[0];
          
          if (isApprove) {
            // Check if item is still available
            if (request.quantity < 1) {
              return await interaction.editReply('Item is no longer available in storage.');
            }
            
            // Update request and decrement quantity in a transaction
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              
              // Update request status
              await client.query(
                `UPDATE loot_requests 
                SET status = 'Approved', updated_at = NOW()
                WHERE id = $1`,
                [requestId]
              );
              
              // Decrement quantity
              await client.query(
                `UPDATE guild_storage_items
                SET quantity = quantity - 1, updated_at = NOW()
                WHERE id = $1 AND quantity > 0`,
                [request.storage_item_id]
              );
              
              await client.query('COMMIT');
            } catch (error) {
              await client.query('ROLLBACK');
              throw error;
            } finally {
              client.release();
            }
            
            // Send notification to user if possible
            if (request.discord_id) {
              try {
                const user = await interaction.client.users.fetch(request.discord_id);
                await user.send(`✅ Your request for **${request.item_name}** has been approved!`);
              } catch (dmError) {
                console.error(`Failed to DM user: ${dmError.message}`);
              }
            }
            
            await interaction.editReply({
              content: `✅ Loot request approved successfully. **${request.item_name}** will be given to **${request.username}**.`
            });
          } else {
            // Deny request
            await pool.query(
              `UPDATE loot_requests 
              SET status = 'Denied', updated_at = NOW()
              WHERE id = $1`,
              [requestId]
            );
            
            // Send notification to user if possible
            if (request.discord_id) {
              try {
                const user = await interaction.client.users.fetch(request.discord_id);
                await user.send(`❌ Your request for **${request.item_name}** has been denied.`);
              } catch (dmError) {
                console.error(`Failed to DM user: ${dmError.message}`);
              }
            }
            
            await interaction.editReply({
              content: `❌ Loot request from **${request.username}** for **${request.item_name}** has been denied.`
            });
          }
        } catch (error) {
          console.error(`Error processing loot request:`, error);
          await interaction.editReply(`Failed to process loot request: ${error.message}`);
        }
      }
      
      // Handle event signup buttons
      if (customId.startsWith('signup_')) {
        const [_, eventId, role] = customId.split('_');
        
        // Check guild mapping first
        const discordGuildId = interaction.guild?.id;
        if (!discordGuildId) {
          return await interaction.reply({
            content: 'This button must be used in a Discord server.',
            ephemeral: true
          });
        }
        
        const appGuildId = await getGuildMapping(discordGuildId);
        if (!appGuildId) {
          return await interaction.reply({
            content: 'This Discord server is not linked to an application guild.',
            ephemeral: true
          });
        }
        
        // Create a fake interaction options object to reuse the signup handler
        interaction.options = {
          getString: (name) => {
            if (name === 'event_id') return eventId;
            if (name === 'role') return role;
            return null;
          }
        };
        
        await handleEventSignupCommand(interaction, appGuildId);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      const errorMessage = 'There was an error processing your request.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error sending error response:', replyError);
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

// Setup command handler
async function handleSetupCommand(interaction) {
  // Only server admins can use this command
  if (!interaction.member.permissions.has('Administrator')) {
    return await interaction.reply({ 
      content: 'Only server administrators can set up the bot.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  // Generate auth token for this setup session (simplified)
  const token = Buffer.from(`${interaction.guild.id}-${Date.now()}`).toString('base64');
  
  // Create the auth URL
  const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}&token=${token}`;
  
  // Create a button for the auth link
  const linkButton = new ButtonBuilder()
    .setLabel('Link your Tevent Guild')
    .setURL(setupUrl)
    .setStyle(ButtonStyle.Link);
  
  const row = new ActionRowBuilder().addComponents(linkButton);
  
  return interaction.editReply({
    content: `Please click the button below to link this Discord server to your Tevent guild. Only Guild Masters can complete this process.`,
    components: [row]
  });
}

// Command handlers for other commands
async function handleStorageCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    console.log(`Fetching storage items directly from database for guild: ${appGuildId}`);
    
    const itemsResult = await pool.query(
      `SELECT gsi.*, i.name, i.type, i.icon 
       FROM guild_storage_items gsi
       LEFT JOIN items i ON gsi.item_id = i.id
       WHERE gsi.guild_id = $1`,
      [appGuildId]
    );
    
    // Format the items similar to the API response
    const formattedItems = itemsResult.rows.map(item => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity || 0,
      trait: item.trait,
      dkp_cost: item.dkp_cost || 0,
      Item: {
        name: item.name,
        type: item.type || 'Unknown',
        icon: item.icon
      }
    }));

    // Get search parameter if provided
    const searchQuery = interaction.options.getString('item');
    
    // Filter items if search was provided
    let displayItems = formattedItems;
    if (searchQuery) {
      displayItems = formattedItems.filter(item => 
        item.Item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Create embeds for items (max 10 per page)
    const embeds = [];
    for (let i = 0; i < Math.min(displayItems.length, 10); i++) {
      const item = displayItems[i];
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
        content: `Found ${displayItems.length} items in guild storage:`,
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
    
    // If specific event ID is requested
    if (eventId) {
      const eventResult = await pool.query(
        `SELECT e.*, 
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
        FROM events e
        WHERE e.id = $1 AND e.guild_id = $2`,
        [eventId, appGuildId]
      );
      
      if (!eventResult.rows || eventResult.rows.length === 0) {
        return await interaction.editReply('Event not found.');
      }
      
      const event = eventResult.rows[0];
      const embed = createEventEmbed({
        ...event,
        participants: {
          tank_count: event.tank_count,
          healer_count: event.healer_count,
          dps_count: event.dps_count
        }
      });
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    // Get all upcoming events
    const now = new Date();
    const eventsResult = await pool.query(
      `SELECT e.*, 
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
      FROM events e
      WHERE e.guild_id = $1 AND e.event_time > $2
      ORDER BY e.event_time ASC
      LIMIT 5`,
      [appGuildId, now]
    );
    
    if (!eventsResult.rows || eventsResult.rows.length === 0) {
      await interaction.editReply('No upcoming events found.');
      return;
    }
    
    const events = eventsResult.rows;
    const embeds = events.map(event => createEventEmbed({
      ...event,
      participants: {
        tank_count: event.tank_count,
        healer_count: event.healer_count,
        dps_count: event.dps_count
      }
    }));
    
    await interaction.editReply({ 
      content: 'Upcoming events:',
      embeds: embeds
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    await interaction.editReply('Failed to fetch events.');
  }
}

async function handleEventSignupCommand(interaction, appGuildId) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const eventId = interaction.options.getString('event_id');
    const role = interaction.options.getString('role');
    const discordUserId = interaction.user.id;
    
    // Check if event exists
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, appGuildId]
    );
    
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return await interaction.editReply(`Event with ID ${eventId} not found.`);
    }
    
    const event = eventResult.rows[0];
    
    // Get user ID from discord ID
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE discord_id = $1',
      [discordUserId]
    );
    
    if (!userResult.rows || userResult.rows.length === 0) {
      return await interaction.editReply('Your user account was not found. Please log in to the website first.');
    }
    
    const user = userResult.rows[0];
    
    // Check if already signed up
    const existingSignupResult = await pool.query(
      'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2 AND guild_id = $3',
      [eventId, user.id, appGuildId]
    );
    
    if (existingSignupResult.rows && existingSignupResult.rows.length > 0) {
      const existingSignup = existingSignupResult.rows[0];
      
      // Update existing signup
      await pool.query(
        'UPDATE event_participants SET role = $1 WHERE id = $2',
        [role, existingSignup.id]
      );
      
      return await interaction.editReply(`You've updated your role for "${event.title}" to ${role}.`);
    }
    
    // Check role capacity
    const roleCountsResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN role = 'TANK' THEN 1 ELSE 0 END) as tank_count,
        SUM(CASE WHEN role = 'HEALER' THEN 1 ELSE 0 END) as healer_count,
        SUM(CASE WHEN role = 'DPS' THEN 1 ELSE 0 END) as dps_count
      FROM event_participants
      WHERE event_id = $1`,
      [eventId]
    );
    
    const roleCounts = roleCountsResult.rows[0];
    
    // Verify there's room for this role
    const roleLimits = {
      'TANK': event.tanks || 0,
      'HEALER': event.healers || 0,
      'DPS': event.dps || 0
    };
    
    const currentCounts = {
      'TANK': parseInt(roleCounts?.tank_count || 0),
      'HEALER': parseInt(roleCounts?.healer_count || 0),
      'DPS': parseInt(roleCounts?.dps_count || 0)
    };
    
    if (currentCounts[role] >= roleLimits[role]) {
      return await interaction.editReply(`Sorry, the ${role} spots are full for this event.`);
    }
    
    // Create new signup
    await pool.query(
      `INSERT INTO event_participants 
        (id, guild_id, event_id, user_id, role, created_at, updated_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
      [appGuildId, eventId, user.id, role]
    );
    
    await interaction.editReply(`You've been signed up for "${event.title}" as ${role}.`);
    
    // Post a public confirmation
    try {
      const confirmEmbed = new EmbedBuilder()
        .setTitle('New Event Signup')
        .setDescription(`${interaction.user.username} has signed up for "${event.title}" as ${role}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.followUp({
        embeds: [confirmEmbed],
        ephemeral: false
      });
    } catch (followupError) {
      console.error('Error sending signup confirmation:', followupError);
    }
  } catch (error) {
    console.error('Error signing up for event:', error);
    await interaction.editReply('Failed to sign up for the event.');
  }
}

async function handleTeamsCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const eventId = interaction.options.getString('event_id');
    
    // Check if event exists
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, appGuildId]
    );
    
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return await interaction.editReply(`Event with ID ${eventId} not found.`);
    }
    
    const event = eventResult.rows[0];
    
    // Get teams for this event
    const teamsResult = await pool.query(
      `SELECT t.id, t.name, t.created_at
      FROM teams t
      WHERE t.event_id = $1 AND t.guild_id = $2
      ORDER BY t.name`,
      [eventId, appGuildId]
    );
    
    if (!teamsResult.rows || teamsResult.rows.length === 0) {
      return await interaction.editReply('No teams found for this event.');
    }
    
    const teams = teamsResult.rows;
    
    // For each team, get members
    const embeds = [];
    
    for (const team of teams) {
      // Get team members with roles
      const membersResult = await pool.query(
        `SELECT tm.role, u.username 
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.position`,
        [team.id]
      );
      
      const members = membersResult.rows;
      
      // Group members by role
      const tanks = members.filter(m => m.role === 'TANK').map(m => m.username);
      const healers = members.filter(m => m.role === 'HEALER').map(m => m.username);
      const dps = members.filter(m => m.role === 'DPS').map(m => m.username);
      
      const embed = new EmbedBuilder()
        .setTitle(`Team: ${team.name}`)
        .setColor('#0099ff')
        .addFields(
          { name: 'Tanks', value: tanks.length > 0 ? tanks.join('\n') : 'None', inline: true },
          { name: 'Healers', value: healers.length > 0 ? healers.join('\n') : 'None', inline: true },
          { name: 'DPS', value: dps.length > 0 ? dps.join('\n') : 'None', inline: true }
        )
        .setFooter({ text: `Team ID: ${team.id}` })
        .setTimestamp(new Date(team.created_at));
      
      embeds.push(embed);
    }
    
    await interaction.editReply({
      content: `Teams for event "${event.title}":`,
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
    // Get guild members with roles
    const membersResult = await pool.query(
      `SELECT gm.role, u.username, u.discord_id, u.avatar_url
      FROM guild_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.guild_id = $1
      ORDER BY CASE
        WHEN gm.role = 'Guild Master' THEN 1
        WHEN gm.role = 'Guild Advisor' THEN 2
        WHEN gm.role = 'Guild Guardian' THEN 3
        ELSE 4
      END, u.username`,
      [appGuildId]
    );
    
    if (!membersResult.rows || membersResult.rows.length === 0) {
      return await interaction.editReply('No members found for this guild.');
    }
    
    const members = membersResult.rows;
    
    // Group members by role
    const guildMasters = members.filter(m => m.role === 'Guild Master');
    const advisors = members.filter(m => m.role === 'Guild Advisor');
    const guardians = members.filter(m => m.role === 'Guild Guardian');
    const regularMembers = members.filter(m => 
      !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(m.role)
    );
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Guild Members')
      .setDescription(`Total members: ${members.length}`)
      .setColor('#0099ff')
      .setTimestamp();
    
    if (guildMasters.length > 0) {
      embed.addFields({
        name: 'Guild Masters',
        value: guildMasters.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    if (advisors.length > 0) {
      embed.addFields({
        name: 'Guild Advisors',
        value: advisors.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    if (guardians.length > 0) {
      embed.addFields({
        name: 'Guild Guardians',
        value: guardians.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    // Regular members (limited to prevent overflow)
    if (regularMembers.length > 0) {
      embed.addFields({
        name: 'Guild Members',
        value: regularMembers.slice(0, 20).map(m => m.username).join('\n') + 
               (regularMembers.length > 20 ? `\n...and ${regularMembers.length - 20} more` : ''),
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching guild members:', error);
    await interaction.editReply('Failed to fetch guild members.');
  }
}

function createEventEmbed(event) {
  // Format event time
  const eventDate = new Date(event.event_time);
  const dateString = eventDate.toLocaleDateString();
  const timeString = eventDate.toLocaleTimeString();
  
  // Get participant counts
  const tankCount = parseInt(event.tank_count || event.participants?.tank_count || 0);
  const healerCount = parseInt(event.healer_count || event.participants?.healer_count || 0);
  const dpsCount = parseInt(event.dps_count || event.participants?.dps_count || 0);
  
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
    .setFooter({ text: `Use /event-signup to join - Event ID: ${event.id}` });
}

// Initialize bot
client.login(process.env.DISCORD_BOT_TOKEN);