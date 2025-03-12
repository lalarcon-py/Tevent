// discord-bot/commands/setup.js
const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const WEB_APP_URL = process.env.WEB_APP_URL;
const IS_DEV = process.env.NODE_ENV === 'development';
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Link this Discord server to your Tevent guild')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  requiresGuild: true,
  
  async execute(interaction, { appGuildId, generateAuthToken }) {
    await interaction.deferReply({ ephemeral: true });
    
    // Check if already linked
    if (appGuildId) {
      return interaction.editReply({
        content: `This Discord server is already linked to a guild in Tevent. If you need to change this, please contact support.`,
        ephemeral: true
      });
    }
    
    // Generate auth token for this setup session
    const token = generateAuthToken(interaction.guildId, interaction.user.id);
    
    // Create the auth URL
    const authUrl = `${WEB_APP_URL}/discord/link?token=${token}&serverId=${interaction.guildId}&serverName=${encodeURIComponent(interaction.guild.name)}`;
    
    // Create a button for the auth link
    const linkButton = new ButtonBuilder()
      .setLabel('Link your Tevent Guild')
      .setURL(authUrl)
      .setStyle(ButtonStyle.Link);
    
    const row = new ActionRowBuilder().addComponents(linkButton);
    
    return interaction.editReply({
      content: `Please click the button below to link this Discord server to your Tevent guild. Only Guild Masters can complete this process.`,
      components: [row],
      ephemeral: true
    });
  }
};