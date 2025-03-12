// discord-bot/commands/storage.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const BOT_SECRET = process.env.BOT_SECRET;
const WEB_APP_URL = process.env.WEB_APP_URL;
const IS_DEV = process.env.NODE_ENV === 'development';
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('storage')
    .setDescription('Display items in the guild storage'),
  
  requiresGuild: true,
  
  async execute(interaction, { appGuildId, axios }) {
    // Check if Discord server is linked to a guild
    if (!appGuildId) {
      return interaction.reply({
        content: `This Discord server is not linked to a Tevent guild yet. An administrator needs to use the \`/setup\` command first.`,
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Get guild settings to check if DKP is enabled
      let dkpEnabled = true; // Default to true
      try {
        const settingsResponse = await axios.get(`${API_URL}/api/guilds/${appGuildId}/settings`);
        dkpEnabled = settingsResponse.data.dkpEnabled === true;
      } catch (err) {
        console.error('Error fetching guild settings:', err);
      }
      
      // Fetch storage items
      const response = await axios.get(`${API_URL}/api/guild-storage/items`, {
        params: { guildId: appGuildId }
      });
      
      const items = response.data;
      
      if (!items || items.length === 0) {
        return interaction.editReply('No items found in guild storage.');
      }
      
      // Create pages for pagination (8 items per page)
      const pages = [];
      for (let i = 0; i < items.length; i += 8) {
        pages.push(items.slice(i, i + 8));
      }
      
      let currentPage = 0;
      
      // Create embed for the first page
      const embed = createStorageEmbed(pages[currentPage], currentPage + 1, pages.length, dkpEnabled);
      
      // Create pagination buttons if needed
      const components = [];
      if (pages.length > 1) {
        const row = createPaginationButtons(currentPage, pages.length);
        components.push(row);
      }
      
      // Send the initial reply
      const reply = await interaction.editReply({
        embeds: [embed],
        components: components.length > 0 ? components : []
      });
      
      // Handle pagination if needed
      if (pages.length > 1) {
        const collector = reply.createMessageComponentCollector({
          time: 300000 // 5 minutes
        });
        
        collector.on('collect', async buttonInt => {
          // Only allow the original user to interact with buttons
          if (buttonInt.user.id !== interaction.user.id) {
            return buttonInt.reply({
              content: 'These buttons are not for you.',
              ephemeral: true
            });
          }
          
          // Handle button actions
          if (buttonInt.customId === 'prev') {
            currentPage = Math.max(0, currentPage - 1);
          } else if (buttonInt.customId === 'next') {
            currentPage = Math.min(pages.length - 1, currentPage + 1);
          }
          
          // Update embed with new page content
          const newEmbed = createStorageEmbed(pages[currentPage], currentPage + 1, pages.length, dkpEnabled);
          const newRow = createPaginationButtons(currentPage, pages.length);
          
          await buttonInt.update({
            embeds: [newEmbed],
            components: [newRow]
          });
        });
        
        collector.on('end', () => {
          // Remove buttons when collector expires
          interaction.editReply({
            components: []
          }).catch(console.error);
        });
      }
      
    } catch (error) {
      console.error('Error fetching storage items:', error);
      interaction.editReply('Failed to fetch guild storage items. Please try again later.');
    }
  }
};

// Helper function to create the storage embed
function createStorageEmbed(items, currentPage, totalPages, dkpEnabled) {
  const embed = new EmbedBuilder()
    .setTitle('Guild Storage')
    .setColor('#90caf9')
    .setDescription('Items currently available in the guild storage:')
    .setTimestamp()
    .setFooter({ text: `Page ${currentPage}/${totalPages}` });
  
  items.forEach(item => {
    const itemName = item.Item ? item.Item.name : 'Unknown Item';
    const itemType = item.Item ? item.Item.type : 'Unknown';
    const quantity = item.quantity || 0;
    
    let fieldValue = `Type: ${itemType}\nQuantity: ${quantity}`;
    
    // Only show DKP cost if DKP is enabled
    if (dkpEnabled) {
      const dkpCost = item.dkp_cost || 0;
      fieldValue += `\nDKP Cost: ${dkpCost}`;
    }
    
    // Add trait if it exists
    if (item.trait) {
      fieldValue += `\nTrait: ${item.trait}`;
    }
    
    embed.addFields({
      name: itemName,
      value: fieldValue,
      inline: true
    });
  });
  
  return embed;
}

// Helper function to create pagination buttons
function createPaginationButtons(currentPage, totalPages) {
  const prevButton = new ButtonBuilder()
    .setCustomId('prev')
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 0);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('next')
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages - 1);
  
  return new ActionRowBuilder().addComponents(prevButton, nextButton);
}