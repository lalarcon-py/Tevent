// discord-bot/commands/storage.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
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
createStorageEmbed: (items) => {
  console.log(`[DEBUG] createStorageEmbed called with ${items?.length || 0} items`);
  try {
    const embed = new EmbedBuilder()
      .setTitle('📦 Guild Storage')
      .setColor('#ff9800')
      .setDescription(`Total items: ${items.length || 0}`);
    
    // Group by item type
    console.log(`[DEBUG] Grouping items by type`);
    const itemsByType = {};
    items.forEach(item => {
      if (!item || !item.Item) {
        console.log(`[DEBUG] Skipping invalid item: ${JSON.stringify(item)}`);
        return;
      }
      
      const type = item.Item.type || 'Unknown';
      if (!itemsByType[type]) {
        itemsByType[type] = [];
      }
      itemsByType[type].push(item);
    });
    
    // Current time for expiration calculations
    const now = new Date();
    
    // Add each type as a field (up to 25 fields - Discord limit)
    console.log(`[DEBUG] Creating embed fields for ${Object.keys(itemsByType).length} item types`);
    let fieldCount = 0;
    for (const [type, typeItems] of Object.entries(itemsByType)) {
      if (fieldCount >= 25) {
        console.log(`[DEBUG] Maximum field count reached (25), stopping`);
        break;
      }
      fieldCount++;
      
      // Limit items shown to prevent exceeding embed limits
      const itemsToShow = typeItems.slice(0, 10);
      const itemLines = itemsToShow.map(item => {
        // Calculate expiration time if available
        let timerText = "";
        if (item.timer_duration && item.created_at) {
          const creationTime = new Date(item.created_at);
          const expirationTime = new Date(creationTime.getTime() + (item.timer_duration * 60000));
          const timeLeft = expirationTime - now;
          
          // Only show timer if it hasn't expired
          if (timeLeft > 0) {
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            timerText = ` ⏰ ${hoursLeft}h ${minutesLeft}m`;
          } else {
            timerText = " ⏰ Roll pending";
          }
        }
        
        return `ID: ${item.id} - ${item.Item.name || 'Unknown'} x${item.quantity || 0}${timerText}`;
      }).join('\n');
      
      const moreText = typeItems.length > 10 ? `\n...and ${typeItems.length - 10} more` : '';
      
      console.log(`[DEBUG] Adding field for type "${type}" with ${typeItems.length} items`);
      embed.addFields({
        name: `${type} (${typeItems.length})`,
        value: (itemLines || 'None') + moreText,
        inline: false
      });
    }
    
    if (fieldCount === 0) {
      console.log(`[DEBUG] No items found, adding empty field`);
      embed.addFields({
        name: 'No Items',
        value: 'Storage is empty'
      });
    }
    
    console.log(`[DEBUG] Storage embed created successfully with ${fieldCount} fields`);
    return embed;
  } catch (error) {
    console.error(`[ERROR] Error creating storage embed: ${error.message}`);
    console.error(`[ERROR] Error stack: ${error.stack}`);
    // Return a simple fallback embed if there's an error
    return new EmbedBuilder()
      .setTitle('Guild Storage')
      .setDescription(`Error creating detailed storage information: ${error.message}`)
      .setColor('#ff0000');
  }
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