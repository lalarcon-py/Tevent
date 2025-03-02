const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
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

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  // Initialize schedulers for events, attendance reports
  require('./utils/scheduler')(client);
});

// Command handling
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

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

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = client;