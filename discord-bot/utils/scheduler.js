const cron = require('node-cron');
const { Guild, DiscordChannelConfig } = require('../../../models');
const { Op } = require('sequelize');
const database = require('./database');
const embedBuilder = require('./embed_builder');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
  // Schedule event reminders (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      // Get all guilds with Discord integration
      const guilds = await Guild.findAll({
        where: { 
          discord_server_id: { [Op.not]: null } 
        },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'events', enabled: true },
          required: false
        }]
      });
      
      for (const guild of guilds) {
        try {
          // Skip if there are no channel configurations
          if (!guild.DiscordChannelConfigs || guild.DiscordChannelConfigs.length === 0) {
            console.log(`Guild ${guild.id} has no channel configuration for events`);
            continue;
          }
          
          // Get the configured channel
          const channelId = guild.DiscordChannelConfigs[0].channel_id;
          const channel = client.channels.cache.get(channelId);
          
          if (!channel) {
            console.warn(`Channel ${channelId} not found for guild ${guild.id}`);
            continue;
          }
          
          // Get upcoming events starting in the next hour
          const events = await database.getUpcomingEvents(guild.id, 1);
          
          if (!events || events.length === 0) {
            continue; // No events to remind
          }
          
          // Filter events that start in the next hour
          const now = new Date();
          const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          
          for (const event of events) {
            try {
              if (!event.event_time) continue;
              
              const eventTime = new Date(event.event_time);
              
              if (eventTime > now && eventTime <= hourFromNow) {
                // Event starts in the next hour - send reminder
                const embed = createEventEmbed(event);
                
                // Create signup buttons
                const row = new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId(`signup_${event.id}_TANK`)
                      .setLabel('Sign up as Tank')
                      .setEmoji('1352736996405022780')
                      .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                      .setCustomId(`signup_${event.id}_HEALER`)
                      .setLabel('Sign up as Healer')
                      .setEmoji('1352737011479482468')
                      .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                      .setCustomId(`signup_${event.id}_DPS`)
                      .setLabel('Sign up as DPS') 
                      .setEmoji('1352737043972624518')
                      .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                      .setCustomId(`signup_${event.id}_ABSENT`)
                      .setLabel('Mark as Absent')
                      .setEmoji('❌')
                      .setStyle(ButtonStyle.Secondary)
  );
                
                try {
                  await channel.send({
                    content: `@here Event starting in less than an hour!`,
                    embeds: [embed],
                    components: [row]
                  });
                } catch (sendError) {
                  console.error(`Error sending event reminder to channel ${channelId}:`, sendError);
                }
              }
            } catch (eventError) {
              console.error(`Error processing event ${event.id} for reminders:`, eventError);
              // Continue with next event
            }
          }
        } catch (guildError) {
          console.error(`Error processing guild ${guild.id} for event reminders:`, guildError);
          // Continue with next guild
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
        where: { 
          discord_server_id: { [Op.not]: null } 
        },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'attendance', enabled: true },
          required: false
        }]
      });
      
      for (const guild of guilds) {
        try {
          // Skip if there are no channel configurations
          if (!guild.DiscordChannelConfigs || guild.DiscordChannelConfigs.length === 0) {
            console.log(`Guild ${guild.id} has no channel configuration for attendance`);
            continue;
          }
          
          const channelId = guild.DiscordChannelConfigs[0].channel_id;
          const channel = client.channels.cache.get(channelId);
          
          if (!channel) {
            console.warn(`Channel ${channelId} not found for guild ${guild.id}`);
            continue;
          }
          
          // Get attendance stats
          const stats = await database.getAttendanceStats(guild.id);
          
          if (!stats || stats.length === 0) {
            console.log(`No attendance stats for guild ${guild.id}`);
            continue;
          }
          
          // Use local createAttendanceEmbed function
          const embed = createAttendanceEmbed(stats);
          
          try {
            await channel.send({
              content: `📊 Weekly Attendance Report`,
              embeds: [embed]
            });
          } catch (sendError) {
            console.error(`Error sending attendance report to channel ${channelId}:`, sendError);
          }
        } catch (guildError) {
          console.error(`Error processing guild ${guild.id} for attendance report:`, guildError);
          // Continue with next guild
        }
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
        where: { 
          discord_server_id: { [Op.not]: null } 
        },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'events', enabled: true },
          required: false
        }]
      });
      
      for (const guild of guilds) {
        try {
          // Skip if there are no channel configurations
          if (!guild.DiscordChannelConfigs || guild.DiscordChannelConfigs.length === 0) {
            console.log(`Guild ${guild.id} has no channel configuration for events`);
            continue;
          }
          
          const channelId = guild.DiscordChannelConfigs[0].channel_id;
          const channel = client.channels.cache.get(channelId);
          
          if (!channel) {
            console.warn(`Channel ${channelId} not found for guild ${guild.id}`);
            continue;
          }
          
          // Get today's events
          const todayEvents = await database.getUpcomingEvents(guild.id, 1);
          
          if (!todayEvents || todayEvents.length === 0) {
            console.log(`No events today for guild ${guild.id}`);
            continue;
          }
          
          // Create embeds for each event (up to 10 - Discord limit)
          const embeds = [];
          const components = [];
          
          for (const event of todayEvents.slice(0, 5)) { // Limit to 5 events for button rows
            try {
              const embed = createEventEmbed(event);
              embeds.push(embed);
              
              // Create signup buttons for each event
              const row = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(`signup_${event.id}_TANK`)
                    .setLabel(`Tank (${event.title.substring(0, 10)}...)`)
                    .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
                    .setCustomId(`signup_${event.id}_HEALER`)
                    .setLabel(`Healer (${event.title.substring(0, 10)}...)`)
                    .setStyle(ButtonStyle.Success),
                  new ButtonBuilder()
                    .setCustomId(`signup_${event.id}_DPS`)
                    .setLabel(`DPS (${event.title.substring(0, 10)}...)`) 
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId(`signup_${event.id}_ABSENT`)
                    .setLabel(`Absent (${event.title.substring(0, 10)}...)`)
                    .setStyle(ButtonStyle.Secondary)
                );
              
              components.push(row);
            } catch (embedError) {
              console.error('Error creating event embed:', embedError);
              // Continue with other events
            }
          }
          
          if (embeds.length === 0) {
            console.log(`No valid embeds for guild ${guild.id} events`);
            continue;
          }
          
          try {
            await channel.send({
              content: `📅 Events scheduled for today:`,
              embeds: embeds,
              components: components
            });
          } catch (sendError) {
            console.error(`Error sending daily events to channel ${channelId}:`, sendError);
          }
        } catch (guildError) {
          console.error(`Error processing guild ${guild.id} for daily events:`, guildError);
          // Continue with next guild
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
        where: { 
          discord_server_id: { [Op.not]: null } 
        },
        include: [{
          model: DiscordChannelConfig,
          where: { channel_type: 'officers', enabled: true },
          required: false
        }]
      });
      
      for (const guild of guilds) {
        try {
          // Skip if there are no channel configurations
          if (!guild.DiscordChannelConfigs || guild.DiscordChannelConfigs.length === 0) {
            console.log(`Guild ${guild.id} has no channel configuration for officers`);
            continue;
          }
          
          const channelId = guild.DiscordChannelConfigs[0].channel_id;
          const channel = client.channels.cache.get(channelId);
          
          if (!channel) {
            console.warn(`Channel ${channelId} not found for guild ${guild.id}`);
            continue;
          }
          
          // Get pending loot requests
          const requests = await database.getLootRequests(guild.id);
          
          if (!requests || requests.length === 0) {
            console.log(`No pending loot requests for guild ${guild.id}`);
            continue;
          }
          
          // Create embed for requests
          const embed = createLootRequestsEmbed(requests);
          
          // Create action buttons for the first few requests
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
          
          try {
            await channel.send({
              content: `🔔 **Daily Reminder**\nThere are ${requests.length} pending loot requests.`,
              embeds: [embed],
              components: rows
            });
          } catch (sendError) {
            console.error(`Error sending loot requests to channel ${channelId}:`, sendError);
          }
        } catch (guildError) {
          console.error(`Error processing guild ${guild.id} for loot requests:`, guildError);
          // Continue with next guild
        }
      }
    } catch (error) {
      console.error('Error in loot request reminder:', error);
    }
  });
  
  // Helper functions for creating embeds
  const createEventEmbed = embedBuilder.createEventEmbed;
  
  function createAttendanceEmbed(stats) {
    try {
      // Ensure stats is an array
      if (!Array.isArray(stats)) {
        stats = [];
      }
      
      // Get total events
      const totalEvents = stats.length > 0 ? stats[0].total_events : 0;
      
      const embed = new EmbedBuilder()
        .setTitle('📊 Attendance Statistics')
        .setColor('#e74c3c')
        .setDescription(`Total events: ${totalEvents}`);
      
      // Top attendance (top 10)
      const topMembers = stats.slice(0, 10).map(s => 
        `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
      ).join('\n');
      
      if (topMembers) {
        embed.addFields({ name: '🏆 Top Attendance', value: topMembers || 'No data' });
      }
      
      // Members below threshold (if applicable)
      const lowAttendance = stats.filter(s => s.attendance_rate < 50).map(s =>
        `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
      ).join('\n');
      
      if (lowAttendance) {
        embed.addFields({ name: '⚠️ Low Attendance', value: lowAttendance });
      }
      
      return embed;
    } catch (error) {
      console.error('Error creating attendance embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Attendance Statistics')
        .setDescription('Error creating detailed attendance information')
        .setColor('#ff0000');
    }
  }
  
  function createLootRequestsEmbed(requests) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🙏 Pending Loot Requests')
        .setColor('#9c27b0')
        .setDescription(`Total requests: ${requests.length || 0}`);
      
      if (!requests.length) {
        embed.addFields({
          name: 'No Requests',
          value: 'There are no pending loot requests.'
        });
        
        return embed;
      }
      
      // Add each request as a field (up to 25 fields - Discord limit)
      for (let i = 0; i < Math.min(requests.length, 25); i++) {
        const request = requests[i];
        const storageItem = request.storageItem || request.StorageItem;
        const item = storageItem?.Item || storageItem?.item;
        const user = request.user || request.User;
        
        if (!item || !user) continue;
        
        embed.addFields({
          name: `Request #${i + 1} (ID: ${request.id})`,
          value: `**Item:** ${item.name || 'Unknown Item'}\n` +
            `**Requester:** ${user.username || 'Unknown User'}\n` +
            `**Requested:** ${new Date(request.created_at).toLocaleString()}`,
          inline: false
        });
      }
      
      embed.setFooter({ text: 'Use buttons below to approve or deny requests' });
      
      return embed;
    } catch (error) {
      console.error('Error creating loot requests embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Pending Loot Requests')
        .setDescription('Error creating detailed request information')
        .setColor('#ff0000');
    }
  }
};