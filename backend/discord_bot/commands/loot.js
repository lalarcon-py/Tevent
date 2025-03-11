// backend/discord_bot/commands/loot.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loot')
    .setDescription('Manage guild loot and storage')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List items in guild storage')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('requests')
        .setDescription('View pending loot requests')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve a loot request')
        .addStringOption(option =>
          option.setName('request_id')
            .setDescription('Request ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Deny a loot request')
        .addStringOption(option =>
          option.setName('request_id')
            .setDescription('Request ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('request')
        .setDescription('Request an item from guild storage')
        .addStringOption(option =>
          option.setName('item_id')
            .setDescription('Item ID')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const guildId = await database.getGuildIdFromDiscord(interaction.guildId);
      
      if (!guildId) {
        return interaction.reply({ 
          content: 'This Discord server is not linked to any guild.',
          ephemeral: true
        });
      }

      if (subcommand === 'list') {
        try {
          const items = await database.getGuildStorageItems(guildId);
          
          if (!items || items.length === 0) {
            return interaction.reply('No items found in guild storage.');
          }
          
          const embed = this.createStorageEmbed(items);
          
          await interaction.reply({ 
            content: '📦 Guild Storage Items',
            embeds: [embed]
          });
        } catch (error) {
          console.error('Error fetching storage items:', error);
          await interaction.reply({ 
            content: 'An error occurred while fetching storage items.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'requests') {
        try {
          const requests = await database.getLootRequests(guildId);
          
          if (!requests || requests.length === 0) {
            return interaction.reply('No pending loot requests found.');
          }
          
          const embed = this.createLootRequestsEmbed(requests);
          
          // Create action buttons for the first few requests
          const rows = [];
          for (let i = 0; i < Math.min(requests.length, 5); i++) {
            const request = requests[i];
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`approve_loot_${request.id}`)
                  .setLabel(`Approve #${i+1}`)
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`deny_loot_${request.id}`)
                  .setLabel(`Deny #${i+1}`)
                  .setStyle(ButtonStyle.Danger)
              );
            rows.push(row);
          }
          
          await interaction.reply({ 
            content: '🙏 Pending Loot Requests',
            embeds: [embed],
            components: rows
          });
        } catch (error) {
          console.error('Error fetching loot requests:', error);
          await interaction.reply({ 
            content: 'An error occurred while fetching loot requests.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'approve') {
        const requestId = interaction.options.getString('request_id');
        
        try {
          const result = await database.approveLootRequest(guildId, requestId);
          
          if (result.success) {
            // Send notification to the requester
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`✅ Your request for **${result.itemName}** has been approved!`);
              }
            } catch (dmError) {
              console.error('Failed to DM user:', dmError);
              // Continue even if DM fails
            }
            
            await interaction.reply({ 
              content: `✅ Loot request approved successfully. **${result.itemName}** will be given to **${result.username}**.`
            });
          } else {
            await interaction.reply({ 
              content: result.message || 'Failed to approve request.',
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('Error approving request:', error);
          await interaction.reply({ 
            content: 'An error occurred while approving the request.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'deny') {
        const requestId = interaction.options.getString('request_id');
        
        try {
          const result = await database.denyLootRequest(guildId, requestId);
          
          if (result.success) {
            // Send notification to the requester
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`❌ Your request for **${result.itemName}** has been denied.`);
              }
            } catch (dmError) {
              console.error('Failed to DM user:', dmError);
              // Continue even if DM fails
            }
            
            await interaction.reply({ 
              content: `❌ Loot request from **${result.username}** for **${result.itemName}** has been denied.`
            });
          } else {
            await interaction.reply({ 
              content: result.message || 'Failed to deny request.',
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('Error denying request:', error);
          await interaction.reply({ 
            content: 'An error occurred while denying the request.',
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'request') {
        const itemId = interaction.options.getString('item_id');
        const discordUserId = interaction.user.id;
        
        try {
          const result = await database.createLootRequest(guildId, itemId, discordUserId);
          
          if (result.success) {
            // Notify officers about the new request in the current channel
            await interaction.reply({ 
              content: `📢 **New Loot Request**\n${interaction.user.username} has requested **${result.itemName}**`,
              components: [
                new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId(`approve_loot_${result.requestId}`)
                      .setLabel('Approve')
                      .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                      .setCustomId(`deny_loot_${result.requestId}`)
                      .setLabel('Deny')
                      .setStyle(ButtonStyle.Danger)
                  )
              ]
            });
          } else {
            await interaction.reply({ 
              content: result.message || 'Failed to submit request.',
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('Error requesting item:', error);
          await interaction.reply({ 
            content: 'An error occurred while requesting the item.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error('General loot command error:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing the loot command.',
        ephemeral: true
      });
    }
  },
  
  // Helper method for storage embed creation
  createStorageEmbed: (items) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('📦 Guild Storage')
        .setColor('#ff9800')
        .setDescription(`Total items: ${items.length || 0}`);
      
      // Group by item type
      const itemsByType = {};
      items.forEach(item => {
        if (!item || !item.Item) return;
        
        const type = item.Item.type || 'Unknown';
        if (!itemsByType[type]) {
          itemsByType[type] = [];
        }
        itemsByType[type].push(item);
      });
      
      // Add each type as a field (up to 25 fields - Discord limit)
      let fieldCount = 0;
      for (const [type, typeItems] of Object.entries(itemsByType)) {
        if (fieldCount >= 25) break;
        fieldCount++;
        
        // Limit items shown to prevent exceeding embed limits
        const itemsToShow = typeItems.slice(0, 10);
        const itemLines = itemsToShow.map(item => 
          `ID: ${item.id} - ${item.Item.name || 'Unknown'} x${item.quantity || 0}`
        ).join('\n');
        
        const moreText = typeItems.length > 10 ? `\n...and ${typeItems.length - 10} more` : '';
        
        embed.addFields({
          name: `${type} (${typeItems.length})`,
          value: (itemLines || 'None') + moreText,
          inline: false
        });
      }
      
      if (fieldCount === 0) {
        embed.addFields({
          name: 'No Items',
          value: 'Storage is empty'
        });
      }
      
      return embed;
    } catch (error) {
      console.error('Error creating storage embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Guild Storage')
        .setDescription('Error creating detailed storage information')
        .setColor('#ff0000');
    }
  },
  
  // Helper method for loot requests embed creation
  createLootRequestsEmbed: (requests) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🙏 Pending Loot Requests')
        .setColor('#9c27b0')
        .setDescription(`Total requests: ${requests.length || 0}`);
      
      if (!requests.length) {
        embed.addFields({
          name: 'No Requests',
          value: 'There are no pending loot requests.'
        });
        
        return embed;
      }
      
      // Add each request as a field (up to 25 fields - Discord limit)
      for (let i = 0; i < Math.min(requests.length, 25); i++) {
        const request = requests[i];
        const storageItem = request.storageItem || request.StorageItem;
        const item = storageItem?.Item || storageItem?.item;
        const user = request.user || request.User;
        
        if (!item || !user) continue;
        
        embed.addFields({
          name: `Request #${i + 1} (ID: ${request.id})`,
          value: `**Item:** ${item.name || 'Unknown Item'}\n` +
            `**Requester:** ${user.username || 'Unknown User'}\n` +
            `**Requested:** ${new Date(request.created_at).toLocaleString()}`,
          inline: false
        });
      }
      
      embed.setFooter({ text: 'Use "/loot approve" or "/loot deny" to handle requests' });
      
      return embed;
    } catch (error) {
      console.error('Error creating loot requests embed:', error);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Pending Loot Requests')
        .setDescription('Error creating detailed request information')
        .setColor('#ff0000');
    }
  }
};