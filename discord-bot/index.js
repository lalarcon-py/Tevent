require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const axios = require('axios');

const API_URL = process.env.API_URL;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Example: Reply to a message
client.on('messageCreate', async (message) => {
  if (message.content === '!ping') {
    message.reply('Pong! 🏓');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.on('guildMemberAdd', async (member) => {
    // Call your backend API to create a user
    await axios.post(`${API_URL}/api/users`, {
      discordId: member.id,
      username: member.user.username,
      role: 'Guild Member',
    });
    console.log(`User ${member.user.username} added to the database!`);
  });