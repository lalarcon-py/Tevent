/**
 * Notification Helper Utilities
 * Functions to help with sending notifications to Discord channels
 */

const { EmbedBuilder } = require('discord.js');
const roleConfig = require('./roleConfig');

/**
 * Send a notification to the configured channel with appropriate role pings
 * @param {object} client - Discord.js client
 * @param {string} guildId - Application guild ID
 * @param {string} discordGuildId - Discord guild ID
 * @param {string} channelId - Discord channel ID to send the notification to
 * @param {string} notificationType - Type of notification (events, items, applications, gear_checks)
 * @param {object} embed - Discord embed to send
 * @param {string} content - Additional content for the message (optional)
 * @param {Array} components - Discord message components (optional)
 * @param {Array} attachments - Discord message attachments (optional)
 * @returns {Promise<object>} The sent message or null if failed
 */
async function sendNotificationWithRolePings(
  client,
  guildId,
  discordGuildId,
  channelId,
  notificationType,
  embed,
  content = null,
  components = null,
  attachments = null
) {
  try {
    // Get roles to ping for this notification type
    const rolesToPing = await roleConfig.getRolesToPing(discordGuildId, notificationType);
    
    // Format role mentions
    let pingContent = '';
    if (rolesToPing && rolesToPing.length > 0) {
      pingContent = rolesToPing.map(roleId => `<@&${roleId}>`).join(' ') + ' ';
    }
    
    // Add any additional content
    if (content) {
      pingContent += content;
    }
    
    // Prepare message options
    const messageOptions = {
      content: pingContent.length > 0 ? pingContent : null,
      embeds: [embed]
    };
    
    if (components) {
      messageOptions.components = components;
    }
    
    if (attachments) {
      messageOptions.files = attachments;
    }
    
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`[ERROR] Channel not found: ${channelId}`);
        return null;
      }
      
      const message = await channel.send(messageOptions);
      return message;
    } catch (discordError) {
      console.error(`[ERROR] Discord API error:`, discordError);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Error sending notification with role pings:`, error);
    return null;
  }
}

/**
 * Send notification to the appropriate configured channel with role pings
 * @param {object} client - Discord.js client
 * @param {string} guildId - Application guild ID
 * @param {string} discordGuildId - Discord guild ID
 * @param {string} notificationType - Type of notification/channel config type
 * @param {object} embed - Discord embed to send
 * @param {string} content - Additional content for the message (optional)
 * @param {Array} components - Discord message components (optional)
 * @param {Array} attachments - Discord message attachments (optional)
 * @returns {Promise<object>} The sent message or null if failed
 */
async function sendNotificationToConfiguredChannel(
  client,
  pool,
  guildId,
  discordGuildId,
  notificationType,
  embed,
  content = null,
  components = null,
  attachments = null
) {
  try {
    // Set pool for the roleConfig module
    if (roleConfig.setPool) {
      roleConfig.setPool(pool);
    }
    
    // Get channel ID from the configuration
    const channelConfigResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = $2 AND enabled = true`,
      [guildId, notificationType]
    );
    
    let channelId;
    if (channelConfigResult.rows.length) {
      channelId = channelConfigResult.rows[0].channel_id;
    } else {
      // Try to get a default channel
      try {
        const guild = await client.guilds.fetch(discordGuildId);
        if (!guild || !guild.systemChannel) {
          console.error(`[ERROR] No suitable channel found for ${notificationType} notifications`);
          return null;
        }
        channelId = guild.systemChannel.id;
      } catch (discordError) {
        console.error(`[ERROR] Error getting default channel:`, discordError);
        return null;
      }
    }
    
    // Send the notification with role pings
    return await sendNotificationWithRolePings(
      client,
      guildId,
      discordGuildId,
      channelId,
      notificationType,
      embed,
      content,
      components,
      attachments
    );
  } catch (error) {
    console.error(`[ERROR] Error sending notification to configured channel:`, error);
    return null;
  }
}

module.exports = {
  sendNotificationWithRolePings,
  sendNotificationToConfiguredChannel
};
