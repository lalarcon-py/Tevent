// backend/utils/discord.js
const axios = require('axios');
require('dotenv').config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

module.exports = {
  send: async (message) => {
    try {
      if (!DISCORD_WEBHOOK_URL) {
        console.warn('Discord webhook URL not configured');
        return;
      }
      
      await axios.post(DISCORD_WEBHOOK_URL, {
        content: message.content
      });
    } catch (error) {
      console.error('Discord webhook failed:', error);
    }
  }
};