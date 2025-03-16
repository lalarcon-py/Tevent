// discord-bot/commands/link.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');

// Get these from environment variables
const API_URL = process.env.BACKEND_URL || 'https://tevent.app';
const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link-guild')
    .setDescription('Link this Discord server to your guild')
    .addStringOption(option => 
      option.setName('join_code')
      .setDescription('Your guild\'s join code (found in guild settings)')
      .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get the join code from command options
      const joinCode = interaction.options.getString('join_code');
      console.log(`Attempting to link Discord server ${interaction.guildId} with join code: ${joinCode}`);
      
      // Log environment variables for debugging (without exposing secrets)
      console.log(`Using API URL: ${API_URL}`);
      console.log(`BOT_WEBHOOK_SECRET is ${BOT_WEBHOOK_SECRET ? 'set' : 'NOT SET'}`);
      console.log(`DISCORD_CLIENT_SECRET is ${process.env.DISCORD_CLIENT_SECRET ? 'set' : 'NOT SET'}`);
      
      // First get a token for authentication
      console.log('Getting authentication token...');
      let tokenResponse;
      try {
        tokenResponse = await axios.post(`${API_URL}/auth/bot-token`, {
          botSecret: process.env.DISCORD_CLIENT_SECRET
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          // Force IPv4 to avoid potential IPv6 connectivity issues
          httpAgent: new require('http').Agent({ family: 4 }),
          httpsAgent: new require('https').Agent({ family: 4 })
        });
        console.log('Token response status:', tokenResponse.status);
      } catch (tokenError) {
        console.error('Error getting token:', tokenError.message);
        if (tokenError.response) {
          console.error('Token error response:', tokenError.response.data);
        }
        throw new Error(`Authentication failed: ${tokenError.message}`);
      }
      
      if (!tokenResponse.data || !tokenResponse.data.token) {
        console.error('Invalid token response:', tokenResponse.data);
        throw new Error('Failed to get authentication token');
      }
      
      const token = tokenResponse.data.token;
      console.log('Authentication token obtained successfully');
      
      // Now call the endpoint to link the guild
      console.log('Linking guild...');
      let response;
      try {
        response = await axios.post(`${API_URL}/api/discord-bot/link-guild`, {
          discordGuildId: interaction.guildId,
          joinCode: joinCode,
          secret: BOT_WEBHOOK_SECRET
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Force IPv4 to avoid potential IPv6 connectivity issues
          httpAgent: new require('http').Agent({ family: 4 }),
          httpsAgent: new require('https').Agent({ family: 4 })
        });
        console.log('Link response status:', response.status);
        console.log('Link response data:', response.data);
      } catch (linkError) {
        console.error('Error linking guild:', linkError.message);
        if (linkError.response) {
          console.error('Link error response:', linkError.response.data);
        }
        throw new Error(`Guild linking failed: ${linkError.message}`);
      }
      
      if (response.data.success) {
        console.log('Guild linking successful');
        await interaction.editReply({
          content: `✅ Successfully linked this Discord server to your guild "${response.data.guildName || 'Unknown'}".`,
          ephemeral: true
        });
      } else {
        console.error('Guild linking failed:', response.data);
        await interaction.editReply({
          content: `❌ Error: ${response.data.error || 'Unknown error occurred'}`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Link guild error:', error);
      let errorMessage = 'Failed to link guild. ';
      
      if (error.response) {
        errorMessage += error.response.data?.error || error.response.data?.message || error.message;
      } else {
        errorMessage += error.message;
      }
      
      await interaction.editReply({
        content: `❌ ${errorMessage}`,
        ephemeral: true
      });
    }
  }
};