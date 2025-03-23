// discord-bot/commands/gearcheck.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const pool = require('../utils/database');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Ensure the data directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'gear');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gearcheck')
    .setDescription('Manage gear checks')
    .addSubcommand(subcommand =>
      subcommand
        .setName('request')
        .setDescription('Request a gear check from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to request a gear check from')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('upload')
        .setDescription('Upload your gear screenshot')
        .addAttachmentOption(option => 
          option.setName('screenshot')
            .setDescription('Your gear screenshot')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve a gear check')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Gear check ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Deny a gear check')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Gear check ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for denial')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check your gear check status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List pending gear checks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const mappingResult = await pool.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        [discordGuildId]
      );
      
      if (!mappingResult.rows.length) {
        return await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
      }
      
      const guildId = mappingResult.rows[0].app_guild_id;
      
      // Get user from discord ID
      const userResult = await pool.query(
        `SELECT id, username, role FROM users WHERE discord_id = $1`,
        [interaction.user.id]
      );
      
      if (!userResult.rows.length) {
        return await interaction.editReply({
          content: 'You need to register on the website first before using this command.',
          ephemeral: true
        });
      }
      
      const userId = userResult.rows[0].id;
      const subcommand = interaction.options.getSubcommand();
      
      // Check if user has admin role for admin-only commands
      const isAdmin = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(userResult.rows[0].role);
      const memberResult = await pool.query(
        `SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
        [guildId, userId]
      );
      
      const hasAdminRole = memberResult.rows.length && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(memberResult.rows[0].role);
      
      // Handle subcommands
      if (subcommand === 'request') {
        if (!hasAdminRole) {
          return await interaction.editReply({
            content: 'Only guild officers can request gear checks.',
            ephemeral: true
          });
        }
        
        const targetUser = interaction.options.getUser('user');
        
        // Find target user in database
        const targetUserResult = await pool.query(
          `SELECT id FROM users WHERE discord_id = $1`,
          [targetUser.id]
        );
        
        if (!targetUserResult.rows.length) {
          return await interaction.editReply({
            content: `${targetUser.username} has not registered on the website yet.`,
            ephemeral: true
          });
        }
        
        // Check if user is a member of this guild
        const membershipResult = await pool.query(
          `SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
          [guildId, targetUserResult.rows[0].id]
        );
        
        if (!membershipResult.rows.length) {
          return await interaction.editReply({
            content: `${targetUser.username} is not a member of this guild.`,
            ephemeral: true
          });
        }
        
        // Check if there's already an active request
        const existingCheckResult = await pool.query(
          `SELECT id, status FROM gear_checks 
           WHERE user_id = $1 AND guild_id = $2 AND status IN ('requested', 'pending')`,
          [targetUserResult.rows[0].id, guildId]
        );
        
        if (existingCheckResult.rows.length) {
          return await interaction.editReply({
            content: `${targetUser.username} already has an active gear check with status: ${existingCheckResult.rows[0].status}.`,
            ephemeral: true
          });
        }
        
        // Create a new gear check request
        const newRequestResult = await pool.query(
          `INSERT INTO gear_checks (id, user_id, guild_id, status, requested_by, image_url, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'requested', $3, '', NOW(), NOW())
           RETURNING id`,
          [targetUserResult.rows[0].id, guildId, userId]
        );
        
        // Send a DM to the target user
        try {
          await targetUser.send(`The officers of your guild have requested a gear check. Please upload a screenshot of your gear using the /gearcheck upload command in the guild's Discord server.`);
        } catch (dmError) {
          console.error(`Could not send DM to user ${targetUser.id}:`, dmError);
          // Continue even if DM fails
        }
        
        return await interaction.editReply({
          content: `Gear check requested from ${targetUser.username} successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'upload') {
        const screenshot = interaction.options.getAttachment('screenshot');
        
        // Validate it's an image
        if (!screenshot.contentType.startsWith('image/')) {
          return await interaction.editReply({
            content: 'Please upload an image file.',
            ephemeral: true
          });
        }
        
        // Download the image
        const response = await axios.get(screenshot.url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Save the image
        const uploadsDir = ensureUploadsDir();
        const fileName = `${uuidv4()}${path.extname(screenshot.name || '.jpg')}`;
        const filePath = path.join(uploadsDir, fileName);
        const fileUrl = `/uploads/gear/${fileName}`;
        
        fs.writeFileSync(filePath, buffer);
        
        // Create a new gear check entry
        const newGearCheckResult = await pool.query(
          `INSERT INTO gear_checks (id, user_id, guild_id, image_url, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'pending', NOW(), NOW())
           RETURNING id`,
          [userId, guildId, fileUrl]
        );
        
        // Send notification to configured gear check channel
        const channelConfigResult = await pool.query(
          `SELECT channel_id FROM discord_channel_config 
           WHERE guild_id = $1 AND channel_type = 'gear_checks' AND enabled = true
           LIMIT 1`,
          [guildId]
        );
        
        let notificationSent = false;
        
        if (channelConfigResult.rows.length) {
          try {
            const channel = await interaction.client.channels.fetch(channelConfigResult.rows[0].channel_id);
            
            const embed = new EmbedBuilder()
              .setTitle('New Gear Check Submitted')
              .setDescription(`**${interaction.user.username}** has submitted a gear check.`)
              .addFields(
                { name: 'Status', value: 'Pending Review', inline: true },
                { name: 'ID', value: newGearCheckResult.rows[0].id, inline: true }
              )
              .setImage(screenshot.url)
              .setColor('#0099ff')
              .setTimestamp();
            
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`approve_gear_${newGearCheckResult.rows[0].id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`deny_gear_${newGearCheckResult.rows[0].id}`)
                  .setLabel('Deny')
                  .setStyle(ButtonStyle.Danger)
              );
            
            await channel.send({ embeds: [embed], components: [row] });
            notificationSent = true;
          } catch (channelError) {
            console.error('Error sending to gear check channel:', channelError);
          }
        }
        
        // If no channel is configured, try to send to a general or system channel
        if (!notificationSent) {
          try {
            // Look for any configured channel
            const anyChannelResult = await pool.query(
              `SELECT channel_id FROM discord_channel_config 
               WHERE guild_id = $1 AND enabled = true
               LIMIT 1`,
              [guildId]
            );
            
            if (anyChannelResult.rows.length) {
              const channel = await interaction.client.channels.fetch(anyChannelResult.rows[0].channel_id);
              
              const embed = new EmbedBuilder()
                .setTitle('New Gear Check Submitted')
                .setDescription(`**${interaction.user.username}** has submitted a gear check.`)
                .addFields(
                  { name: 'Status', value: 'Pending Review', inline: true },
                  { name: 'ID', value: newGearCheckResult.rows[0].id, inline: true }
                )
                .setImage(screenshot.url)
                .setColor('#0099ff')
                .setTimestamp();
              
              const row = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(`approve_gear_${newGearCheckResult.rows[0].id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success),
                  new ButtonBuilder()
                    .setCustomId(`deny_gear_${newGearCheckResult.rows[0].id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger)
                );
              
              await channel.send({ embeds: [embed], components: [row] });
              notificationSent = true;
            }
          } catch (fallbackError) {
            console.error('Error sending to fallback channel:', fallbackError);
          }
        }
        
        return await interaction.editReply({
          content: `Gear check submitted successfully${notificationSent ? ' and officers have been notified.' : '.'}`,
          ephemeral: true
        });
      }
      else if (subcommand === 'approve') {
        if (!hasAdminRole) {
          return await interaction.editReply({
            content: 'Only guild officers can approve gear checks.',
            ephemeral: true
          });
        }
        
        const gearCheckId = interaction.options.getString('id');
        
        // Find the gear check
        const gearCheckResult = await pool.query(
          `SELECT gc.*, u.username, u.discord_id 
           FROM gear_checks gc
           JOIN users u ON gc.user_id = u.id
           WHERE gc.id = $1 AND gc.guild_id = $2 AND gc.status = 'pending'`,
          [gearCheckId, guildId]
        );
        
        if (!gearCheckResult.rows.length) {
          return await interaction.editReply({
            content: 'Gear check not found or not pending.',
            ephemeral: true
          });
        }
        
        // Update gear check status
        await pool.query(
          `UPDATE gear_checks 
           SET status = 'approved', reviewed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          [userId, gearCheckId]
        );
        
        // Update the user's gear_screenshot_url
        await pool.query(
          `UPDATE users 
           SET gear_screenshot_url = $1 
           WHERE id = $2`,
          [gearCheckResult.rows[0].image_url, gearCheckResult.rows[0].user_id]
        );
        
        // Try to notify the user
        if (gearCheckResult.rows[0].discord_id) {
          try {
            const user = await interaction.client.users.fetch(gearCheckResult.rows[0].discord_id);
            await user.send('Your gear check has been approved!');
          } catch (dmError) {
            console.error(`Could not send DM to user ${gearCheckResult.rows[0].discord_id}:`, dmError);
          }
        }
        
        return await interaction.editReply({
          content: `Gear check for ${gearCheckResult.rows[0].username} approved successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'deny') {
        if (!hasAdminRole) {
          return await interaction.editReply({
            content: 'Only guild officers can deny gear checks.',
            ephemeral: true
          });
        }
        
        const gearCheckId = interaction.options.getString('id');
        const reason = interaction.options.getString('reason');
        
        // Find the gear check
        const gearCheckResult = await pool.query(
          `SELECT gc.*, u.username, u.discord_id 
           FROM gear_checks gc
           JOIN users u ON gc.user_id = u.id
           WHERE gc.id = $1 AND gc.guild_id = $2 AND gc.status = 'pending'`,
          [gearCheckId, guildId]
        );
        
        if (!gearCheckResult.rows.length) {
          return await interaction.editReply({
            content: 'Gear check not found or not pending.',
            ephemeral: true
          });
        }
        
        // Update gear check status
        await pool.query(
          `UPDATE gear_checks 
           SET status = 'Denied', denial_reason = $1, reviewed_by = $2, updated_at = NOW()
           WHERE id = $3`,
          [reason, userId, gearCheckId]
        );
        
        // Try to notify the user
        if (gearCheckResult.rows[0].discord_id) {
          try {
            const user = await interaction.client.users.fetch(gearCheckResult.rows[0].discord_id);
            await user.send(`Your gear check has been denied. Reason: ${reason}`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${gearCheckResult.rows[0].discord_id}:`, dmError);
          }
        }
        
        return await interaction.editReply({
          content: `Gear check for ${gearCheckResult.rows[0].username} denied successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'status') {
        // Get status for current user
        const gearCheckResult = await pool.query(
          `SELECT * FROM gear_checks 
           WHERE user_id = $1 AND guild_id = $2
           ORDER BY created_at DESC LIMIT 1`,
          [userId, guildId]
        );
        
        if (!gearCheckResult.rows.length) {
          return await interaction.editReply({
            content: 'You have no gear check history.',
            ephemeral: true
          });
        }
        
        const statusMap = {
          'requested': '⏳ Requested - Please upload your gear screenshot',
          'pending': '🔍 Pending - Waiting for officer review',
          'approved': '✅ Approved',
          'Denied': '❌ Denied'
        };
        
        const statusText = statusMap[gearCheckResult.rows[0].status] || gearCheckResult.rows[0].status;
        
        const embed = new EmbedBuilder()
          .setTitle('Your Gear Check Status')
          .setDescription(`Current status: ${statusText}`)
          .setColor(gearCheckResult.rows[0].status === 'approved' ? '#00ff00' : 
                    gearCheckResult.rows[0].status === 'Denied' ? '#ff0000' : '#ffff00')
          .setTimestamp(new Date(gearCheckResult.rows[0].updated_at));
        
        if (gearCheckResult.rows[0].denial_reason) {
          embed.addFields({ name: 'Denial Reason', value: gearCheckResult.rows[0].denial_reason });
        }
        
        if (gearCheckResult.rows[0].image_url && gearCheckResult.rows[0].image_url !== '') {
          try {
            // Convert relative path to full URL
            const baseUrl = process.env.API_URL || 'https://tevent.app';
            const imageUrl = `${baseUrl}${gearCheckResult.rows[0].image_url}`;
            embed.setImage(imageUrl);
          } catch (imageError) {
            console.error('Error setting image URL:', imageError);
          }
        }
        
        return await interaction.editReply({
          embeds: [embed],
          ephemeral: true
        });
      }
      else if (subcommand === 'list') {
        if (!hasAdminRole) {
          return await interaction.editReply({
            content: 'Only guild officers can list gear checks.',
            ephemeral: true
          });
        }
        
        // Get recent gear checks
        const gearChecksResult = await pool.query(
          `SELECT gc.*, u.username, u.discord_id 
           FROM gear_checks gc
           JOIN users u ON gc.user_id = u.id
           WHERE gc.guild_id = $1 AND gc.status = 'pending'
           ORDER BY gc.created_at DESC
           LIMIT 10`,
          [guildId]
        );
        
        if (!gearChecksResult.rows.length) {
          return await interaction.editReply({
            content: 'No pending gear checks found.',
            ephemeral: true
          });
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Pending Gear Checks')
          .setDescription(`Found ${gearChecksResult.rows.length} pending gear checks.`)
          .setColor('#0099ff')
          .setTimestamp();
        
        gearChecksResult.rows.forEach((check, index) => {
          embed.addFields({
            name: `#${index + 1} - ${check.username}`,
            value: `ID: ${check.id}\nSubmitted: ${new Date(check.created_at).toLocaleString()}`
          });
        });
        
        return await interaction.editReply({
          embeds: [embed],
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing gear check command:', error);
      return await interaction.editReply({
        content: 'An error occurred while processing your request.',
        ephemeral: true
      });
    }
  },
  
  // Handle button interactions related to gear checks
  async handleButtons(interaction) {
    if (!interaction.isButton()) return false;
    
    const customId = interaction.customId;
    
    // Check if this is a gear check button
    if (!customId.startsWith('approve_gear_') && !customId.startsWith('deny_gear_')) {
      return false;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const mappingResult = await pool.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        [discordGuildId]
      );
      
      if (!mappingResult.rows.length) {
        await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
        return true;
      }
      
      const guildId = mappingResult.rows[0].app_guild_id;
      
      // Get user from discord ID
      const userResult = await pool.query(
        `SELECT id, username FROM users WHERE discord_id = $1`,
        [interaction.user.id]
      );
      
      if (!userResult.rows.length) {
        await interaction.editReply({
          content: 'You need to register on the website first before using this function.',
          ephemeral: true
        });
        return true;
      }
      
      // Check if user has admin role
      const memberResult = await pool.query(
        `SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
        [guildId, userResult.rows[0].id]
      );
      
      const hasAdminRole = memberResult.rows.length && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(memberResult.rows[0].role);
      
      if (!hasAdminRole) {
        await interaction.editReply({
          content: 'Only guild officers can approve or deny gear checks.',
          ephemeral: true
        });
        return true;
      }
      
      // Extract gear check ID from button ID
      const gearCheckId = customId.replace('approve_gear_', '').replace('deny_gear_', '');
      
      // Find the gear check
      const gearCheckResult = await pool.query(
        `SELECT gc.*, u.username, u.discord_id 
         FROM gear_checks gc
         JOIN users u ON gc.user_id = u.id
         WHERE gc.id = $1 AND gc.guild_id = $2 AND gc.status = 'pending'`,
        [gearCheckId, guildId]
      );
      
      if (!gearCheckResult.rows.length) {
        await interaction.editReply({
          content: 'Gear check not found or not pending.',
          ephemeral: true
        });
        return true;
      }
      
      if (customId.startsWith('approve_gear_')) {
        // Approve gear check
        await pool.query(
          `UPDATE gear_checks 
           SET status = 'approved', reviewed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          [userResult.rows[0].id, gearCheckId]
        );
        
        // Update the user's gear_screenshot_url
        await pool.query(
          `UPDATE users 
           SET gear_screenshot_url = $1 
           WHERE id = $2`,
          [gearCheckResult.rows[0].image_url, gearCheckResult.rows[0].user_id]
        );
        
        // Try to notify the user
        if (gearCheckResult.rows[0].discord_id) {
          try {
            const user = await interaction.client.users.fetch(gearCheckResult.rows[0].discord_id);
            await user.send('Your gear check has been approved!');
          } catch (dmError) {
            console.error(`Could not send DM to user ${gearCheckResult.rows[0].discord_id}:`, dmError);
          }
        }
        
        // Update the message
        try {
          const message = interaction.message;
          const embed = EmbedBuilder.from(message.embeds[0])
            .setColor('#00ff00')
            .spliceFields(0, 1, { name: 'Status', value: '✅ Approved', inline: true })
            .addFields({ name: 'Approved By', value: interaction.user.username, inline: true });
          
          await message.edit({ embeds: [embed], components: [] });
        } catch (messageError) {
          console.error('Error updating message:', messageError);
        }
        
        await interaction.editReply({
          content: `Gear check for ${gearCheckResult.rows[0].username} approved successfully.`,
          ephemeral: true
        });
      } else if (customId.startsWith('deny_gear_')) {
        // Create a modal for denial reason
        const modal = {
          title: 'Deny Gear Check',
          custom_id: `deny_gear_modal_${gearCheckId}`,
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'denial_reason',
              label: 'Reason for denial',
              style: 2,
              min_length: 1,
              max_length: 1000,
              placeholder: 'Please provide a reason for denial',
              required: true
            }]
          }]
        };
        
        await interaction.showModal(modal);
      }
      
      return true;
    } catch (error) {
      console.error('Error handling gear check button:', error);
      await interaction.editReply({
        content: 'An error occurred while processing the button.',
        ephemeral: true
      });
      return true;
    }
  },

  // Handle modal submissions for gear check denials
  async handleModals(interaction) {
    if (!interaction.isModalSubmit()) return false;
    
    const customId = interaction.customId;
    
    // Check if this is a gear check modal
    if (!customId.startsWith('deny_gear_modal_')) {
      return false;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Extract gear check ID from modal ID
      const gearCheckId = customId.replace('deny_gear_modal_', '');
      
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const mappingResult = await pool.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        [discordGuildId]
      );
      
      if (!mappingResult.rows.length) {
        await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
        return true;
      }
      
      const guildId = mappingResult.rows[0].app_guild_id;
      
      // Get user from discord ID
      const userResult = await pool.query(
        `SELECT id FROM users WHERE discord_id = $1`,
        [interaction.user.id]
      );
      
      if (!userResult.rows.length) {
        await interaction.editReply({
          content: 'You need to register on the website first before using this function.',
          ephemeral: true
        });
        return true;
      }
      
      // Get denial reason from modal
      const reason = interaction.fields.getTextInputValue('denial_reason');
      
      // Find the gear check
      const gearCheckResult = await pool.query(
        `SELECT gc.*, u.username, u.discord_id 
         FROM gear_checks gc
         JOIN users u ON gc.user_id = u.id
         WHERE gc.id = $1 AND gc.guild_id = $2 AND gc.status = 'pending'`,
        [gearCheckId, guildId]
      );
      
      if (!gearCheckResult.rows.length) {
        await interaction.editReply({
          content: 'Gear check not found or not pending.',
          ephemeral: true
        });
        return true;
      }
      
      // Update gear check status
      await pool.query(
        `UPDATE gear_checks 
         SET status = 'Denied', denial_reason = $1, reviewed_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [reason, userResult.rows[0].id, gearCheckId]
      );
      
      // Try to notify the user
      if (gearCheckResult.rows[0].discord_id) {
        try {
          const user = await interaction.client.users.fetch(gearCheckResult.rows[0].discord_id);
          await user.send(`Your gear check has been denied. Reason: ${reason}`);
        } catch (dmError) {
          console.error(`Could not send DM to user ${gearCheckResult.rows[0].discord_id}:`, dmError);
        }
      }
      
      // Update the message
      try {
        const message = interaction.message;
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor('#ff0000')
          .spliceFields(0, 1, { name: 'Status', value: '❌ Denied', inline: true })
          .addFields(
            { name: 'Denied By', value: interaction.user.username, inline: true },
            { name: 'Reason', value: reason }
          );
        
        await message.edit({ embeds: [embed], components: [] });
      } catch (messageError) {
        console.error('Error updating message:', messageError);
      }
      
      await interaction.editReply({
        content: `Gear check for ${gearCheckResult.rows[0].username} denied successfully.`,
        ephemeral: true
      });
      
      return true;
    } catch (error) {
      console.error('Error handling gear check modal:', error);
      await interaction.editReply({
        content: 'An error occurred while processing the modal submission.',
        ephemeral: true
      });
      return true;
    }
  }
};