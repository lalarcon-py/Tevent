const { Guild, GuildMember, User } = require('../../../models');
const { Op } = require('sequelize');

module.exports = async (interaction) => {
  // SECURITY FIX: More restricted public commands list
  const publicCommands = ['help', 'event list'];
  
  if (publicCommands.includes(interaction.commandName)) {
    return true;
  }
  
  // Get Discord server ID
  const discordServerId = interaction.guildId;
  if (!discordServerId) return false;
  
  // Get Discord user ID
  const discordUserId = interaction.user.id;
  
  // SECURITY FIX: Check for server administrator or owner status
  const isServerAdmin = interaction.member?.permissions?.has('ADMINISTRATOR') || 
                        interaction.member?.id === interaction.guild?.ownerId;
  
  // Find guild by Discord server ID
  const guild = await Guild.findOne({
    where: { discord_server_id: discordServerId }
  });
  
  if (!guild) return false;
  
  // Find user by Discord ID
  const user = await User.findOne({
    where: { discord_id: discordUserId }
  });
  
  if (!user) return false;
  
  // SECURITY FIX: Include Guild Guardian role for admin-level commands
  const guildMember = await GuildMember.findOne({
    where: {
      guild_id: guild.id,
      user_id: user.id,
      role: {
        [Op.in]: ['Guild Master', 'Guild Advisor', 'Guild Guardian']
      }
    }
  });
  
  // SECURITY FIX: Higher security for certain commands
  const highSecurityCommands = ['loot approve', 'loot deny', 'event delete'];
  
  if (highSecurityCommands.includes(`${interaction.commandName} ${interaction.options?.getSubcommand() || ''}`)) {
    return guildMember?.role === 'Guild Master' || guildMember?.role === 'Guild Advisor';
  }
  
  return !!guildMember || isServerAdmin;
};