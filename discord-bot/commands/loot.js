// backend/discord_bot/commands/loot.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const embedBuilder = require('../utils/embed_builder');
const { sequelize } = require('../../../config/database');

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
    console.log(`[DEBUG] Loot command execution started. Subcommand: ${interaction.options.getSubcommand()}`);
    try {
      // Ensure database connection first
      try {
        console.log(`[DEBUG] Checking database connection...`);
        await sequelize.authenticate();
        console.log(`[DEBUG] Database connection successful`);
      } catch (dbError) {
        console.error(`[ERROR] Database connection failed: ${dbError.message}`);
        console.error(`[ERROR] Database error stack: ${dbError.stack}`);
        return interaction.reply({ 
          content: 'Unable to connect to the database. Please contact the bot administrator.',
          ephemeral: true 
        });
      }

      const subcommand = interaction.options.getSubcommand();
      console.log(`[DEBUG] Processing subcommand: ${subcommand}`);
      
      // Get guild ID directly from the database mapping
      console.log(`[DEBUG] Getting guild ID from Discord ID: ${interaction.guildId}`);
      let guildId;
      try {
        guildId = await database.getGuildIdFromDiscord(interaction.guildId);
        console.log(`[DEBUG] Result of getGuildIdFromDiscord: ${guildId}`);
      } catch (mappingError) {
        console.error(`[ERROR] Error resolving guild mapping: ${mappingError.message}`);
        console.error(`[ERROR] Mapping error stack: ${mappingError.stack}`);
        return interaction.reply({ 
          content: 'Error connecting to the guild database. Please contact the bot administrator.',
          ephemeral: true
        });
      }
      
      if (!guildId) {
        console.log(`[DEBUG] No guild ID found for Discord server ${interaction.guildId}`);
        return interaction.reply({ 
          content: 'This Discord server is not linked to any guild in the application.',
          ephemeral: true
        });
      }

      console.log(`[DEBUG] Found guild ID: ${guildId} for Discord server: ${interaction.guildId}`);

      if (subcommand === 'list') {
        try {
          console.log(`[DEBUG] Starting 'list' subcommand for guild: ${guildId}`);
          // Show "thinking" state while fetching data
          await interaction.deferReply();
          console.log(`[DEBUG] Deferred reply - now fetching storage items`);
          
          // Check database connection again right before fetching items
          try {
            await sequelize.query('SELECT 1');
            console.log(`[DEBUG] Database connection still good before fetching items`);
          } catch (connError) {
            console.error(`[ERROR] Database connection lost before fetching items: ${connError.message}`);
          }
          
          console.log(`[DEBUG] Calling database.getGuildStorageItems(${guildId})`);
          let items;
          try {
            items = await database.getGuildStorageItems(guildId);
            console.log(`[DEBUG] Successfully got ${items?.length || 0} storage items`);
          } catch (itemsError) {
            console.error(`[ERROR] Failed to get storage items: ${itemsError.message}`);
            console.error(`[ERROR] Items error stack: ${itemsError.stack}`);
            throw itemsError; // Re-throw to be caught by the outer catch
          }
          
          if (!items || items.length === 0) {
            console.log(`[DEBUG] No items found, sending empty response`);
            return interaction.editReply('No items found in guild storage.');
          }
          
          console.log(`[DEBUG] Creating storage embed for ${items.length} items`);
          const embed = this.createStorageEmbed(items);
          
          console.log(`[DEBUG] Sending response with embed`);
          await interaction.editReply({ 
            content: '📦 Guild Storage Items',
            embeds: [embed]
          });
          console.log(`[DEBUG] Response sent successfully`);
        } catch (error) {
          console.error(`[ERROR] Error in 'list' subcommand: ${error.message}`);
          console.error(`[ERROR] Error stack: ${error.stack}`);
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: `An error occurred while fetching storage items: ${error.message}`,
            });
          } else {
            await interaction.reply({ 
              content: `An error occurred while fetching storage items: ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
      else if (subcommand === 'requests') {
        try {
          console.log(`[DEBUG] Starting 'requests' subcommand for guild: ${guildId}`);
          await interaction.deferReply();
          console.log(`[DEBUG] Deferred reply - now fetching loot requests`);
          
          console.log(`[DEBUG] Calling database.getLootRequests(${guildId})`);
          const requests = await database.getLootRequests(guildId);
          console.log(`[DEBUG] Got ${requests?.length || 0} loot requests`);
          
          if (!requests || requests.length === 0) {
            console.log(`[DEBUG] No requests found, sending empty response`);
            return interaction.editReply('No pending loot requests found.');
          }
          
          console.log(`[DEBUG] Creating loot requests embed for ${requests.length} requests`);
          const embed = this.createLootRequestsEmbed(requests);
          
          // Create action buttons for the first few requests
          console.log(`[DEBUG] Creating action buttons for up to 5 requests`);
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
          
          console.log(`[DEBUG] Sending response with embed and ${rows.length} button rows`);
          await interaction.editReply({ 
            content: '🙏 Pending Loot Requests',
            embeds: [embed],
            components: rows
          });
          console.log(`[DEBUG] Response sent successfully`);
        } catch (error) {
          console.error(`[ERROR] Error in 'requests' subcommand: ${error.message}`);
          console.error(`[ERROR] Error stack: ${error.stack}`);
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: `An error occurred while fetching loot requests: ${error.message}`,
            });
          } else {
            await interaction.reply({ 
              content: `An error occurred while fetching loot requests: ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
      else if (subcommand === 'approve') {
        const requestId = interaction.options.getString('request_id');
        console.log(`[DEBUG] Starting 'approve' subcommand for request: ${requestId}`);
        
        try {
          await interaction.deferReply();
          console.log(`[DEBUG] Deferred reply - now approving request`);
          
          // Add more robust error handling for the database operation
          console.log(`[DEBUG] Calling database.approveLootRequest(${guildId}, ${requestId})`);
          let result;
          try {
            result = await database.approveLootRequest(guildId, requestId);
            console.log(`[DEBUG] Approval result: ${JSON.stringify(result)}`);
          } catch (dbError) {
            console.error(`[ERROR] Database error during loot approval: ${dbError.message}`);
            console.error(`[ERROR] Database error stack: ${dbError.stack}`);
            return interaction.editReply('Database error: Unable to approve request. Please try again later.');
          }
          
          if (result.success) {
            // Send notification to the requester
            console.log(`[DEBUG] Sending notification to requester: ${result.discordId || 'unknown'}`);
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`✅ Your request for **${result.itemName}** has been approved!`);
                console.log(`[DEBUG] Notification sent successfully`);
              }
            } catch (dmError) {
              console.error(`[ERROR] Failed to DM user: ${dmError.message}`);
              // Continue even if DM fails
            }
            
            console.log(`[DEBUG] Sending success response`);
            await interaction.editReply({ 
              content: `✅ Loot request approved successfully. **${result.itemName}** will be given to **${result.username}**.`
            });
          } else {
            console.log(`[DEBUG] Approval failed: ${result.message || 'unknown reason'}`);
            await interaction.editReply({ 
              content: result.message || 'Failed to approve request.'
            });
          }
          console.log(`[DEBUG] Approval process complete`);
        } catch (error) {
          console.error(`[ERROR] Error in 'approve' subcommand: ${error.message}`);
          console.error(`[ERROR] Error stack: ${error.stack}`);
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: `An error occurred while approving the request: ${error.message}`
            });
          } else {
            await interaction.reply({ 
              content: `An error occurred while approving the request: ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
      else if (subcommand === 'deny') {
        const requestId = interaction.options.getString('request_id');
        console.log(`[DEBUG] Starting 'deny' subcommand for request: ${requestId}`);
        
        try {
          await interaction.deferReply();
          console.log(`[DEBUG] Deferred reply - now denying request`);
          
          // Add more robust error handling for the database operation
          console.log(`[DEBUG] Calling database.denyLootRequest(${guildId}, ${requestId})`);
          let result;
          try {
            result = await database.denyLootRequest(guildId, requestId);
            console.log(`[DEBUG] Denial result: ${JSON.stringify(result)}`);
          } catch (dbError) {
            console.error(`[ERROR] Database error during loot denial: ${dbError.message}`);
            console.error(`[ERROR] Database error stack: ${dbError.stack}`);
            return interaction.editReply('Database error: Unable to deny request. Please try again later.');
          }
          
          if (result.success) {
            // Send notification to the requester
            console.log(`[DEBUG] Sending notification to requester: ${result.discordId || 'unknown'}`);
            try {
              if (result.discordId) {
                const user = await interaction.client.users.fetch(result.discordId);
                await user.send(`❌ Your request for **${result.itemName}** has been denied.`);
                console.log(`[DEBUG] Notification sent successfully`);
              }
            } catch (dmError) {
              console.error(`[ERROR] Failed to DM user: ${dmError.message}`);
              // Continue even if DM fails
            }
            
            console.log(`[DEBUG] Sending success response`);
            await interaction.editReply({ 
              content: `❌ Loot request from **${result.username}** for **${result.itemName}** has been denied.`
            });
          } else {
            console.log(`[DEBUG] Denial failed: ${result.message || 'unknown reason'}`);
            await interaction.editReply({ 
              content: result.message || 'Failed to deny request.'
            });
          }
          console.log(`[DEBUG] Denial process complete`);
        } catch (error) {
          console.error(`[ERROR] Error in 'deny' subcommand: ${error.message}`);
          console.error(`[ERROR] Error stack: ${error.stack}`);
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: `An error occurred while denying the request: ${error.message}`
            });
          } else {
            await interaction.reply({ 
              content: `An error occurred while denying the request: ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
      else if (subcommand === 'request') {
        const itemId = interaction.options.getString('item_id');
        const discordUserId = interaction.user.id;
        console.log(`[DEBUG] Starting 'request' subcommand - Item: ${itemId}, User: ${discordUserId}`);
        
        try {
          await interaction.deferReply();
          console.log(`[DEBUG] Deferred reply - now creating loot request`);
          
          // Add more robust error handling for the database operation
          console.log(`[DEBUG] Calling database.createLootRequest(${guildId}, ${itemId}, ${discordUserId})`);
          let result;
          try {
            result = await database.createLootRequest(guildId, itemId, discordUserId);
            console.log(`[DEBUG] Create request result: ${JSON.stringify(result)}`);
          } catch (dbError) {
            console.error(`[ERROR] Database error during loot request creation: ${dbError.message}`);
            console.error(`[ERROR] Database error stack: ${dbError.stack}`);
            return interaction.editReply('Database error: Unable to create request. Please try again later.');
          }
          
          if (result.success) {
            console.log(`[DEBUG] Creating action buttons for request: ${result.requestId}`);
            // Notify officers about the new request
            await interaction.editReply({ 
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
            console.log(`[DEBUG] Request notification sent successfully`);
          } else {
            console.log(`[DEBUG] Request creation failed: ${result.message || 'unknown reason'}`);
            await interaction.editReply({ 
              content: result.message || 'Failed to submit request.'
            });
          }
          console.log(`[DEBUG] Request process complete`);
        } catch (error) {
          console.error(`[ERROR] Error in 'request' subcommand: ${error.message}`);
          console.error(`[ERROR] Error stack: ${error.stack}`);
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: `An error occurred while requesting the item: ${error.message}`
            });
          } else {
            await interaction.reply({ 
              content: `An error occurred while requesting the item: ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
    } catch (error) {
      console.error(`[ERROR] General loot command error: ${error.message}`);
      console.error(`[ERROR] Full error stack: ${error.stack}`);
      try {
        if (interaction.deferred) {
          await interaction.editReply({ 
            content: `An error occurred while processing the loot command: ${error.message}`
          });
        } else {
          await interaction.reply({ 
            content: `An error occurred while processing the loot command: ${error.message}`,
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error(`[ERROR] Error sending error message: ${replyError.message}`);
      }
    }
  },
  
  // Helper method for storage embed creation
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
        const itemLines = itemsToShow.map(item => 
          `ID: ${item.id} - ${item.Item.name || 'Unknown'} x${item.quantity || 0}`
        ).join('\n');
        
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
  },
  
  // Helper method for loot requests embed creation
  createLootRequestsEmbed: (requests) => {
    console.log(`[DEBUG] createLootRequestsEmbed called with ${requests?.length || 0} requests`);
    try {
      const embed = new EmbedBuilder()
        .setTitle('🙏 Pending Loot Requests')
        .setColor('#9c27b0')
        .setDescription(`Total requests: ${requests.length || 0}`);
      
      if (!requests.length) {
        console.log(`[DEBUG] No requests found, adding empty field`);
        embed.addFields({
          name: 'No Requests',
          value: 'There are no pending loot requests.'
        });
        
        return embed;
      }
      
      // Add each request as a field (up to 25 fields - Discord limit)
      console.log(`[DEBUG] Adding request fields to embed (max 25)`);
      let validRequestsAdded = 0;
      for (let i = 0; i < Math.min(requests.length, 25); i++) {
        const request = requests[i];
        const storageItem = request.storageItem || request.StorageItem;
        const item = storageItem?.Item || storageItem?.item;
        const user = request.user || request.User;
        
        if (!item || !user) {
          console.log(`[DEBUG] Skipping invalid request #${i+1}: missing item or user`);
          continue;
        }
        
        console.log(`[DEBUG] Adding field for request #${i+1}: ${item.name} by ${user.username}`);
        embed.addFields({
          name: `Request #${i + 1} (ID: ${request.id})`,
          value: `**Item:** ${item.name || 'Unknown Item'}\n` +
            `**Requester:** ${user.username || 'Unknown User'}\n` +
            `**Requested:** ${new Date(request.created_at).toLocaleString()}`,
          inline: false
        });
        validRequestsAdded++;
      }
      
      console.log(`[DEBUG] Added ${validRequestsAdded} request fields to embed`);
      embed.setFooter({ text: 'Use "/loot approve" or "/loot deny" to handle requests' });
      
      return embed;
    } catch (error) {
      console.error(`[ERROR] Error creating loot requests embed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      // Return a simple fallback embed if there's an error
      return new EmbedBuilder()
        .setTitle('Pending Loot Requests')
        .setDescription(`Error creating detailed request information: ${error.message}`)
        .setColor('#ff0000');
    }
  }
};