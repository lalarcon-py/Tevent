// backend/discord_bot/commands/loot.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        const embed = embedBuilder.createStorageEmbed(items);
        
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
        const embed = embedBuilder.createLootRequestsEmbed(requests);
        
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
            const user = await interaction.client.users.fetch(result.discordId);
            await user.send(`✅ Your request for **${result.itemName}** has been approved!`);
          } catch (dmError) {
            console.error('Failed to DM user:', dmError);
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
            const user = await interaction.client.users.fetch(result.discordId);
            await user.send(`❌ Your request for **${result.itemName}** has been denied.`);
          } catch (dmError) {
            console.error('Failed to DM user:', dmError);
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
  },
};