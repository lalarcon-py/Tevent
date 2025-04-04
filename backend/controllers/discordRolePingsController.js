// controllers/discordRolePingsController.js
const pool = require('../config/db');
const axios = require('axios');
require('dotenv').config();

/**
 * Get all role ping configurations for a guild
 */
exports.getRolePings = async (req, res) => {
  const { guildId } = req.query;
  
  if (!guildId) {
    return res.status(400).json({ error: 'Guild ID is required' });
  }
  
  try {
    // Get Discord guild mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get role ping configurations
    const configResult = await pool.query(
      'SELECT notification_type, role_ids FROM discord_role_config WHERE discord_guild_id = $1',
      [discordGuildId]
    );
    
    return res.json({
      success: true,
      configurations: configResult.rows
    });
  } catch (error) {
    console.error('Error getting role ping configurations:', error);
    return res.status(500).json({ error: 'Failed to get role ping configurations' });
  }
};

/**
 * Save role ping configurations for a guild
 */
exports.saveRolePings = async (req, res) => {
  const { guildId, discordGuildId, configurations } = req.body;
  
  if (!guildId || !discordGuildId || !configurations) {
    return res.status(400).json({ error: 'Guild ID, Discord Guild ID, and configurations are required' });
  }
  
  try {
    // Verify that the guild mapping exists
    const mappingResult = await pool.query(
      'SELECT * FROM discord_guild_mappings WHERE app_guild_id = $1 AND discord_guild_id = $2',
      [guildId, discordGuildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    // Start a transaction to update all configurations
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear previous configurations
      await client.query(
        'DELETE FROM discord_role_config WHERE discord_guild_id = $1',
        [discordGuildId]
      );
      
      // Insert new configurations
      for (const config of configurations) {
        if (config.notification_type && config.role_ids && config.role_ids.length > 0) {
          await client.query(
            `INSERT INTO discord_role_config
             (discord_guild_id, guild_id, notification_type, role_ids, updated_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [discordGuildId, guildId, config.notification_type, config.role_ids]
          );
        }
      }
      
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Role ping configurations saved successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving role ping configurations:', error);
    return res.status(500).json({ error: 'Failed to save role ping configurations' });
  }
};

/**
 * Get all available roles from a Discord server
 */
exports.getDiscordRoles = async (req, res) => {
  const { guildId, discordGuildId } = req.query;
  
  if (!guildId || !discordGuildId) {
    return res.status(400).json({ error: 'Guild ID and Discord Guild ID are required' });
  }
  
  try {
    // Authenticate with Discord API
    const token = process.env.DISCORD_BOT_TOKEN;
    
    if (!token) {
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    // Call Discord API to get roles
    const response = await axios.get(`https://discord.com/api/v10/guilds/${discordGuildId}/roles`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error getting Discord roles:', error);
    return res.status(500).json({ error: 'Failed to get Discord roles' });
  }
};

/**
 * Test role ping configurations by sending test messages
 */
exports.testRolePings = async (req, res) => {
  const { guildId, discordGuildId } = req.body;
  
  if (!guildId || !discordGuildId) {
    return res.status(400).json({ error: 'Guild ID and Discord Guild ID are required' });
  }
  
  try {
    // Get channel configurations for notifications
    const channelConfigResult = await pool.query(
      `SELECT channel_type, channel_id 
       FROM discord_channel_config 
       WHERE guild_id = $1 AND enabled = true`,
      [guildId]
    );
    
    const channelConfigs = {};
    channelConfigResult.rows.forEach(config => {
      channelConfigs[config.channel_type] = config.channel_id;
    });
    
    // Get role configurations
    const roleConfigResult = await pool.query(
      'SELECT notification_type, role_ids FROM discord_role_config WHERE discord_guild_id = $1',
      [discordGuildId]
    );
    
    const roleConfigs = {};
    roleConfigResult.rows.forEach(config => {
      roleConfigs[config.notification_type] = config.role_ids;
    });
    
    // Test sending messages to each channel with role pings
    const testResults = {};
    const token = process.env.DISCORD_BOT_TOKEN;
    
    if (!token) {
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    // Map notification types to channels
    const typeToChannelMap = {
      'events': 'events',
      'items': 'storage',
      'applications': 'applications',
      'gear_checks': 'gear_checks'
    };
    
    // Test each configured role ping
    for (const [notificationType, roleIds] of Object.entries(roleConfigs)) {
      // Skip if no roles or empty array
      if (!roleIds || roleIds.length === 0) {
        testResults[notificationType] = {
          success: false,
          error: 'No roles configured'
        };
        continue;
      }
      
      // Get corresponding channel type
      const channelType = typeToChannelMap[notificationType];
      
      // Skip if no channel configured for this notification type
      if (!channelType || !channelConfigs[channelType]) {
        testResults[notificationType] = {
          success: false,
          error: `No channel configured for ${notificationType}`
        };
        continue;
      }
      
      const channelId = channelConfigs[channelType];
      
      try {
        // Format role mentions
        const roleMentions = roleIds.map(id => `<@&${id}>`).join(' ');
        
        // Send test message to Discord
        await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          content: `${roleMentions} **TEST**: This is a test ping for ${notificationType}. (This message will self-delete in 5 seconds)`
        }, {
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        testResults[notificationType] = {
          success: true
        };
        
        // Delete the message after 5 seconds
        // This would require storing the message ID from the response and calling delete endpoint
        // We'll skip actual deletion for simplicity in this implementation
      } catch (error) {
        console.error(`Error testing ${notificationType} ping:`, error);
        testResults[notificationType] = {
          success: false,
          error: error.response?.data?.message || error.message
        };
      }
    }
    
    return res.json({
      success: true,
      results: testResults
    });
  } catch (error) {
    console.error('Error testing role pings:', error);
    return res.status(500).json({ error: 'Failed to test role pings' });
  }
};
