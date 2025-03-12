// discord-bot/commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display help information about Tevent bot'),
  
  requiresGuild: false,
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Tevent Guild Management Bot')
      .setColor('#90caf9')
      .setDescription('Manage your Tevent guild directly from Discord')
      .addFields([
        { 
          name: '/setup', 
          value: 'Link this Discord server to your Tevent guild (Admin only)',
        },
        { 
          name: '/storage', 
          value: 'Display items in the guild storage',
        },
        { 
          name: '/help', 
          value: 'Show this help message',
        }
      ])
      .setFooter({ text: 'Tevent.app - Guild Management Made Easy' });
    
    await interaction.reply({ embeds: [embed] });
  }
};