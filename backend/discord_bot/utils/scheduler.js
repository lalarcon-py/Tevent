const cron = require('node-cron');
const { Guild, DiscordChannelConfig } = require('../../../models');
const database = require('./database');
const embedBuilder = require('./embed_builder');

module.exports = (client) => {
  // Schedule event reminders (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      // Get all guilds with Discord integration
      const guilds = await Guild.findAll({
        where: { discord_server_id: { [Op.not]: null } },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'events', enabled: true }
        }]
      });
      
      for (const guild of guilds) {
        // Get the configured channel
        const channelId = guild.DiscordChannelConfigs[0].channel_id;
        const channel = client.channels.cache.get(channelId);
        
        if (!channel) continue;
        
        // Get upcoming events starting in the next hour
        const events = await database.getUpcomingEvents(guild.id, 1);
        
        for (const event of events) {
          const eventTime = new Date(event.event_time);
          const now = new Date();
          const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          
          if (eventTime > now && eventTime <= hourFromNow) {
            // Event starts in the next hour - send reminder
            const embed = embedBuilder.createEventEmbed(event);
            
            await channel.send({
              content: `@everyone Event starting in less than an hour!`,
              embeds: [embed]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in event reminder scheduler:', error);
    }
  });
  
  // Weekly attendance report (Sundays at midnight)
  cron.schedule('0 0 * * 0', async () => {
    try {
      // Get all guilds with Discord integration
      const guilds = await Guild.findAll({
        where: { discord_server_id: { [Op.not]: null } },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'attendance', enabled: true }
        }]
      });
      
      for (const guild of guilds) {
        const channelId = guild.DiscordChannelConfigs[0].channel_id;
        const channel = client.channels.cache.get(channelId);
        
        if (!channel) continue;
        
        // Get attendance stats
        const stats = await database.getAttendanceStats(guild.id);
        const embed = embedBuilder.createAttendanceEmbed(stats);
        
        await channel.send({
          content: `📊 Weekly Attendance Report`,
          embeds: [embed]
        });
      }
    } catch (error) {
      console.error('Error in weekly attendance report:', error);
    }
  });
  
  // Daily upcoming events reminder (8am every day)
  cron.schedule('0 8 * * *', async () => {
    try {
      // Get all guilds with Discord integration
      const guilds = await Guild.findAll({
        where: { discord_server_id: { [Op.not]: null } },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'events', enabled: true }
        }]
      });
      
      for (const guild of guilds) {
        const channelId = guild.DiscordChannelConfigs[0].channel_id;
        const channel = client.channels.cache.get(channelId);
        
        if (!channel) continue;
        
        // Get today's events
        const todayEvents = await database.getUpcomingEvents(guild.id, 1);
        
        if (todayEvents.length > 0) {
          const embeds = todayEvents.map(event => embedBuilder.createEventEmbed(event));
          
          await channel.send({
            content: `📅 Events scheduled for today:`,
            embeds: embeds.slice(0, 10) // Discord limits to 10 embeds
          });
        }
      }
    } catch (error) {
      console.error('Error in daily events reminder:', error);
    }
  });

  // Daily loot request reminder (8pm every day)
cron.schedule('0 20 * * *', async () => {
    try {
      // Get all guilds with Discord integration
      const guilds = await Guild.findAll({
        where: { discord_server_id: { [Op.not]: null } },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'officers', enabled: true }
        }]
      });
      
      for (const guild of guilds) {
        const channelId = guild.DiscordChannelConfigs[0].channel_id;
        const channel = client.channels.cache.get(channelId);
        
        if (!channel) continue;
        
        // Get pending loot requests
        const requests = await database.getLootRequests(guild.id);
        
        if (requests.length > 0) {
          const embed = embedBuilder.createLootRequestsEmbed(requests);
          
          const rows = [];
          for (let i = 0; i < Math.min(requests.length, 5); i++) {
            const request = requests[i];
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`approve_loot_${request.id}`)
                  .setLabel(`Approve #${i+1}`)
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`deny_loot_${request.id}`)
                  .setLabel(`Deny #${i+1}`)
                  .setStyle(ButtonStyle.Danger)
              );
            rows.push(row);
          }
          
          await channel.send({
            content: `🔔 **Daily Reminder**\nThere are ${requests.length} pending loot requests.`,
            embeds: [embed],
            components: rows
          });
        }
      }
    } catch (error) {
      console.error('Error in loot request reminder:', error);
    }
  });
  
};