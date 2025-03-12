const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const BOT_SECRET = process.env.BOT_SECRET;
const WEB_APP_URL = process.env.WEB_APP_URL;
const IS_DEV = process.env.NODE_ENV === 'development';
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ]
});

// Store commands
client.commands = new Collection();
// Store pending auth sessions
const authSessions = new Map();
// Store guild mappings
const guildMappings = new Map();

// Authenticate with backend
async function authenticateWithBackend() {
  try {
    const response = await axios.post(`${API_URL}/auth/bot-login`, {
      botSecret: BOT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TeventBot/1.0'
      }
    });
    
    if (response.status === 200) {
      console.log('Bot authenticated with backend');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Authentication error:', error.message);
    return false;
  }
}

// Load guild mappings
async function loadGuildMappings() {
  try {
    const response = await axios.get(`${API_URL}/api/discord-bot/guild-mappings`, {
      headers: {
        'User-Agent': 'TeventBot/1.0'
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      guildMappings.clear();
      response.data.forEach(mapping => {
        guildMappings.set(mapping.discord_guild_id, mapping.app_guild_id);
      });
      console.log(`Loaded ${guildMappings.size} guild mappings`);
    }
  } catch (error) {
    console.error('Error loading guild mappings:', error.message);
  }
}

// Load and register commands
async function registerCommands() {
  const commands = [];
  client.commands.clear();
  
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`The command at ${filePath} is missing required properties`);
    }
  }
  
  try {
    console.log('Refreshing application commands...');
    
    const rest = new REST().setToken(TOKEN);
    if (IS_DEV && TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
        { body: commands }
      );
      console.log(`Registered commands in test guild: ${TEST_GUILD_ID}`);
    } else {
      // Register globally in production
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log('Registered commands globally');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Generate a unique auth token for setup process
function generateAuthToken(discordGuildId, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + (30 * 60 * 1000); // 30 minutes
  
  authSessions.set(token, {
    discordGuildId,
    userId,
    expiry
  });
  
  // Clean up expired tokens every 5 minutes
  setTimeout(() => {
    const now = Date.now();
    for (const [key, session] of authSessions.entries()) {
      if (session.expiry < now) {
        authSessions.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  
  return token;
}

// Initialize bot
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Authenticate with backend
  const authenticated = await authenticateWithBackend();
  if (authenticated) {
    await loadGuildMappings();
    await registerCommands();
  } else {
    console.error('Failed to authenticate with backend. Bot will not function properly.');
  }
});

// Handle interaction events (slash commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    // Get app guild ID if needed
    let appGuildId = null;
    
    if (command.requiresGuild && interaction.guildId) {
      appGuildId = guildMappings.get(interaction.guildId);
    }
    
    // Execute command with context
    await command.execute(interaction, {
      client,
      appGuildId,
      axios,
      guildMappings,
      authSessions,
      generateAuthToken
    });
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorReply = {
      content: 'There was an error executing this command!',
      ephemeral: true
    };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

// Web endpoint for completing auth flow
const express = require('express');
const app = express();
app.use(express.json());

app.post('/auth/complete', async (req, res) => {
  const { token, guildId, guildName } = req.body;
  
  if (!token || !guildId || !guildName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Verify token
  const session = authSessions.get(token);
  if (!session) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  
  // Check if token is expired
  if (session.expiry < Date.now()) {
    authSessions.delete(token);
    return res.status(403).json({ error: 'Token expired' });
  }
  
  try {
    // Link the Discord guild to the app guild
    const response = await axios.post(`${API_URL}/api/discord-bot/link-guild`, {
      discordGuildId: session.discordGuildId,
      appGuildId: guildId
    }, {
      headers: {
        'User-Agent': 'TeventBot/1.0'
      }
    });
    
    // Update local cache
    guildMappings.set(session.discordGuildId, guildId);
    
    // Notify user in Discord
    const guild = client.guilds.cache.get(session.discordGuildId);
    if (guild) {
      try {
        const member = await guild.members.fetch(session.userId);
        member.send(`Your server "${guild.name}" has been successfully linked to guild "${guildName}" in Tevent!`);
      } catch (discordError) {
        console.error('Error sending Discord notification:', discordError);
      }
    }
    
    // Remove the token
    authSessions.delete(token);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error completing auth:', error);
    return res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// Start Express server (for handling auth callbacks)
const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// Start the Discord bot
client.login(TOKEN);