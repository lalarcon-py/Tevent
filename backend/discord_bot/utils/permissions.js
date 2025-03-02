const { Guild, GuildMember, User } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Checks if a Discord user has permission to execute commands
 */
module.exports = async (interaction) => {
  // Some commands are available to everyone
  const publicCommands = ['event list', 'team view', 'help'];
  
  if (publicCommands.includes(interaction.commandName)) {
    return true;
  }
  
  // Get Discord server ID
  const discordServerId = interaction.guildId;
  if (!discordServerId) return false;
  
  // Get Discord user ID
  const discordUserId = interaction.user.id;
  
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
  
  // Check if user is Guild Master or Guild Advisor
  const guildMember = await GuildMember.findOne({
    where: {
      guild_id: guild.id,
      user_id: user.id,
      role: {
        [Op.in]: ['Guild Master', 'Guild Advisor']
      }
    }
  });
  
  return !!guildMember;
};