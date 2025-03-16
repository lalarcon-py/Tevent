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
      
      // First get a token for authentication
      const tokenResponse = await axios.post(`${API_URL}/auth/bot-token`, {
        botSecret: process.env.DISCORD_CLIENT_SECRET
      });
      
      const token = tokenResponse.data.token;
      
      // Now call the endpoint to link the guild
      const response = await axios.post(`${API_URL}/api/discord-bot/link-guild`, {
        discordGuildId: interaction.guildId,
        joinCode: joinCode,
        secret: BOT_WEBHOOK_SECRET
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        await interaction.editReply({
          content: `✅ Successfully linked this Discord server to your guild "${response.data.guildName || 'Unknown'}".`,
          ephemeral: true
        });
      } else {
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