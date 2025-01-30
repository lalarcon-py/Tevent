const axios = require('axios');

module.exports = {
  send: async (payload) => {
    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        ...payload,
        embeds: [{
          color: 0x0099ff,
          timestamp: new Date(),
          ...payload.embed
        }]
      });
    } catch (error) {
      console.error('Discord webhook failed:', error);
    }
  }
};