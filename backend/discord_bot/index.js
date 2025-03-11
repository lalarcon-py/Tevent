//backend/discord_bot/index.js
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('../config/database');
const db = require('./models');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

async function checkDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Test if we can access the discord_guild_mappings table
    try {
      const [result] = await sequelize.query(
        'SELECT COUNT(*) FROM discord_guild_mappings',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log(`Found ${result.count} Discord-to-Guild mappings in database.`);
    } catch (err) {
      console.error('Error accessing discord_guild_mappings table:', err.message);
      console.warn('The bot may not be able to resolve guild mappings.');
    }
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1); // Exit with error code
  }
}

// Run the check before starting
checkDatabaseConnection().then(() => {
  // Start bot only after database connection is verified
  client.login(process.env.DISCORD_BOT_TOKEN);
}).catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});

// Command collection setup
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Register commands
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// Rate limiting for commands
const commandRateLimit = new Map();

// Ready event
client.once(Events.ClientReady, () => {
  // Initialize schedulers for events, attendance reports
  require('./utils/scheduler')(client);
  console.log('Discord bot is ready!');
});

// Command handling
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // SECURITY FIX: Implement rate limiting
  const userId = interaction.user.id;
  const now = Date.now();
  const rateLimit = {
    maxCommands: 5,  // 5 commands
    timeWindow: 60000 // per minute
  };
  
  if (!commandRateLimit.has(userId)) {
    commandRateLimit.set(userId, { count: 0, resetTime: now + rateLimit.timeWindow });
  }
  
  const userLimit = commandRateLimit.get(userId);
  
  // Reset rate if time expired
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + rateLimit.timeWindow;
  }
  
  // Check rate limit
  if (userLimit.count >= rateLimit.maxCommands) {
    return interaction.reply({
      content: 'You are sending commands too quickly. Please wait a minute.',
      ephemeral: true
    });
  }
  
  userLimit.count++;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Check permissions
    const permissionCheck = require('./utils/permissions');
    const hasPermission = await permissionCheck(interaction);
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You need to be a Guild Master or Guild Advisor to use this command.',
        ephemeral: true 
      });
    }
    
    await command.execute(interaction);
  } catch (error) {
    console.error('Command execution error:', error);
    await interaction.reply({ 
      content: 'There was an error executing this command.',
      ephemeral: true 
    });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  
  try {
    const permissionCheck = require('./utils/permissions');
    const hasPermission = await permissionCheck(interaction);
    
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You need to be a Guild Master or Guild Advisor to use this.',
        ephemeral: true 
      });
    }
    
    if (interaction.customId.startsWith('approve_loot_')) {
      const requestId = interaction.customId.replace('approve_loot_', '');
      
      try {
        const database = require('./utils/database');
        const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
        
        if (!guildId) {
          return interaction.reply({
            content: 'This Discord server is not linked to any guild.',
            ephemeral: true
          });
        }
        
        // Fix: Add better error handling
        try {
          const result = await database.approveLootRequest(guildId, requestId);
          
          if (result.success) {
            // Send notification to the requester
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`✅ Your request for **${result.itemName}** has been approved!`);
              }
            } catch (dmError) {
              console.error('Failed to DM user:', dmError);
              // Continue even if DM fails
            }
            
            await interaction.update({ 
              content: `✅ **Loot Request Approved**\nRequest for **${result.itemName}** from **${result.username}** has been approved by ${interaction.user.username}.`,
              components: []
            });
          } else {
            await interaction.reply({ 
              content: result.message || 'Failed to approve request.',
              ephemeral: true
            });
          }
        } catch (databaseError) {
          console.error('Database error during loot approval:', databaseError);
          await interaction.reply({ 
            content: 'A database error occurred while approving the request.',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error approving loot request:', error);
        await interaction.reply({ 
          content: 'An error occurred while approving the request.',
          ephemeral: true
        });
      }
    }
    else if (interaction.customId.startsWith('deny_loot_')) {
      const requestId = interaction.customId.replace('deny_loot_', '');
      
      try {
        const database = require('./utils/database');
        const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
        
        if (!guildId) {
          return interaction.reply({
            content: 'This Discord server is not linked to any guild.',
            ephemeral: true
          });
        }
        
        // Fix: Add better error handling
        try {
          const result = await database.denyLootRequest(guildId, requestId);
          
          if (result.success) {
            // Send notification to the requester
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`❌ Your request for **${result.itemName}** has been denied.`);
              }
            } catch (dmError) {
              console.error('Failed to DM user:', dmError);
              // Continue even if DM fails
            }
            
            await interaction.update({ 
              content: `❌ **Loot Request Denied**\nRequest for **${result.itemName}** from **${result.username}** has been denied by ${interaction.user.username}.`,
              components: []
            });
          } else {
            await interaction.reply({ 
              content: result.message || 'Failed to deny request.',
              ephemeral: true
            });
          }
        } catch (databaseError) {
          console.error('Database error during loot denial:', databaseError);
          await interaction.reply({ 
            content: 'A database error occurred while denying the request.',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error denying loot request:', error);
        await interaction.reply({ 
          content: 'An error occurred while denying the request.',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Button interaction error:', error);
    try {
      await interaction.reply({ 
        content: 'An error occurred while processing this action.',
        ephemeral: true
      });
    } catch (replyError) {
      // Handle case where we can't reply (e.g., already replied)
      console.error('Could not reply with error message:', replyError);
    }
  }
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = client;