// In discord-bot/utils/timeUtils.js
const DEFAULT_SERVER_TIMEZONE = 'America/Los_Angeles'; // Default to Pacific Time

/**
 * Get the preferred time zone for a Discord server
 * @param {string} discordGuildId - Discord guild ID
 * @returns {string} - Time zone identifier (e.g., 'America/Los_Angeles')
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
async function getServerTimeZone(discordGuildId) {
  try {
    // Query the database for server-specific time zone settings
    const result = await pool.query(
      `SELECT time_zone FROM discord_server_settings 
       WHERE discord_guild_id = $1`,
      [discordGuildId]
    );
    
    // Return the stored time zone or default if not found
    return (result.rows.length > 0 && result.rows[0].time_zone) 
      ? result.rows[0].time_zone 
      : DEFAULT_SERVER_TIMEZONE;
  } catch (error) {
    console.error(`[ERROR] Failed to get server time zone: ${error.message}`);
    return DEFAULT_SERVER_TIMEZONE;
  }
}

/**
 * Format a UTC date to a Discord server's local time
 * @param {Date|string} utcDate - Date in UTC
 * @param {string} discordGuildId - Discord guild ID
 * @returns {Date} - Date adjusted for Discord server's time zone
 */
async function formatToServerTime(utcDate, discordGuildId) {
  try {
    const date = new Date(utcDate);
    const serverTz = await getServerTimeZone(discordGuildId);
    
    // For Discord calendar events, we need to offset the time to match 
    // the server's time zone before sending to Discord API
    const tzOffset = getTimezoneOffset(serverTz);
    const adjustedDate = new Date(date.getTime() + tzOffset);
    
    return adjustedDate;
  } catch (error) {
    console.error(`[ERROR] Error formatting to server time: ${error.message}`);
    return new Date(utcDate); // Return original as fallback
  }
}

/**
 * Get offset in milliseconds for a time zone
 * @param {string} timezone - Time zone identifier
 * @returns {number} - Offset in milliseconds
 */
function getTimezoneOffset(timezone) {
  try {
    // Get current date
    const date = new Date();
    
    // Find the offset between UTC and the specified time zone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    return utcDate.getTime() - tzDate.getTime();
  } catch (error) {
    console.error(`[ERROR] Error calculating time zone offset: ${error.message}`);
    return 0; // Return no offset as fallback
  }
}

/**
 * Create a Discord timestamp string that will display in each user's local time
 * @param {Date|string} date - The date to format
 * @param {string} format - Discord format code (F, R, etc.)
 * @returns {string} - Formatted Discord timestamp string
 */
function createDiscordTimestamp(date, format = 'F') {
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${timestamp}:${format}>`;
}

module.exports = {
  getServerTimeZone,
  formatToServerTime,
  createDiscordTimestamp
};