// backend/discord_bot/utils/permissions.js
const { Guild, GuildMember, User } = require('../../../models');
const { Op } = require('sequelize');

// At the top after imports
console.log('[DEBUG] Loading permissions module');

module.exports = async (interaction) => {
  console.log(`[DEBUG] Permission check for user: ${interaction.user.id}, command: ${interaction.commandName}`);
  
  // SECURITY FIX: More restricted public commands list
  const publicCommands = ['help', 'event list'];
  
  if (publicCommands.includes(interaction.commandName)) {
    console.log(`[DEBUG] Command ${interaction.commandName} is public, allowing access`);
    return true;
  }
  
  // Get Discord server ID
  const discordServerId = interaction.guildId;
  if (!discordServerId) {
    console.log(`[DEBUG] No Discord server ID found, denying access`);
    return false;
  }
  
  console.log(`[DEBUG] Discord server ID: ${discordServerId}`);
  
  // Get Discord user ID
  const discordUserId = interaction.user.id;
  console.log(`[DEBUG] Discord user ID: ${discordUserId}`);
  
  // SECURITY FIX: Check for server administrator or owner status
  const isServerAdmin = interaction.member?.permissions?.has('ADMINISTRATOR') || 
                        interaction.member?.id === interaction.guild?.ownerId;
  
  console.log(`[DEBUG] Is server admin: ${isServerAdmin}`);
  
  try {
    // Find guild by querying the mapping
    console.log(`[DEBUG] Looking up Guild mapping for Discord server ID: ${discordServerId}`);
    
    const [mappingResult] = await sequelize.query(
      `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
      { 
        bind: [discordServerId.toString()],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!mappingResult) {
      console.log(`[DEBUG] No guild mapping found for Discord server ID: ${discordServerId}`);
      return false;
    }
    
    const guildId = mappingResult.app_guild_id;
    console.log(`[DEBUG] Found guild mapping: ${guildId}`);
    
    // Find user by Discord ID
    console.log(`[DEBUG] Looking up User by Discord ID: ${discordUserId}`);
    const [userResult] = await sequelize.query(
      `SELECT id FROM users WHERE discord_id = $1`,
      { 
        bind: [discordUserId.toString()],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!userResult) {
      console.log(`[DEBUG] No user found for Discord ID: ${discordUserId}`);
      return false;
    }
    
    const userId = userResult.id;
    console.log(`[DEBUG] Found user: ${userId}`);
    
    // SECURITY FIX: Include Guild Guardian role for admin-level commands
    console.log(`[DEBUG] Checking if user has admin role for guild: ${guildId}`);
    const [guildMemberResult] = await sequelize.query(
      `SELECT role FROM guild_members 
       WHERE guild_id = $1 AND user_id = $2 
       AND role IN ('Guild Master', 'Guild Advisor', 'Guild Guardian')`,
      { 
        bind: [guildId, userId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    const hasRoleAccess = !!guildMemberResult;
    console.log(`[DEBUG] Guild member role check result: ${hasRoleAccess}, role: ${guildMemberResult?.role || 'none'}`);
    
    // SECURITY FIX: Higher security for certain commands
    const commandName = `${interaction.commandName} ${interaction.options?.getSubcommand() || ''}`;
    console.log(`[DEBUG] Checking security for command: ${commandName}`);
    
    const highSecurityCommands = ['loot approve', 'loot deny', 'event delete'];
    
    if (highSecurityCommands.includes(commandName)) {
      const hasHighPermission = guildMemberResult?.role === 'Guild Master' || guildMemberResult?.role === 'Guild Advisor';
      console.log(`[DEBUG] High security command check: ${hasHighPermission}`);
      return hasHighPermission;
    }
    
    const result = hasRoleAccess || isServerAdmin;
    console.log(`[DEBUG] Final permission result: ${result}`);
    return result;
  } catch (error) {
    console.error(`[ERROR] Permission check error: ${error.message}`);
    console.error(`[ERROR] Error stack: ${error.stack}`);
    return false;
  }
};