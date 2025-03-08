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

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    
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
        
        const result = await database.approveLootRequest(guildId, requestId);
        
        if (result.success) {
          // Send notification to the requester
          try {
            const user = await interaction.client.users.fetch(result.discordId);
            await user.send(`✅ Your request for **${result.itemName}** has been approved!`);
          } catch (error) {
            console.error('Failed to DM user:', error);
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
        
        const result = await database.denyLootRequest(guildId, requestId);
        
        if (result.success) {
          // Send notification to the requester
          try {
            const user = await interaction.client.users.fetch(result.discordId);
            await user.send(`❌ Your request for **${result.itemName}** has been denied.`);
          } catch (error) {
            console.error('Failed to DM user:', error);
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
      } catch (error) {
        console.error('Error denying loot request:', error);
        await interaction.reply({ 
          content: 'An error occurred while denying the request.',
          ephemeral: true
        });
      }
    }
  });

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = client;