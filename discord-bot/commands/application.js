// discord-bot/commands/application.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { sequelize } = require('../../../config/database');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Ensure the screenshots directory exists
const ensureScreenshotsDir = () => {
  const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'screenshots');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Manage guild applications')
    .addSubcommand(subcommand =>
      subcommand
        .setName('submit')
        .setDescription('Submit an application to join the guild')
        .addStringOption(option =>
          option.setName('ingame_name')
            .setDescription('Your in-game character name')
            .setRequired(true)
        )
        .addAttachmentOption(option =>
          option.setName('screenshot')
            .setDescription('Screenshot of your character')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('questlog_link')
            .setDescription('Link to your questlog profile')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('previous_guilds')
            .setDescription('Your previous guilds (if any)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('leave_reason')
            .setDescription('Why did you leave your previous guild?')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('combat_power')
            .setDescription('Your current combat power')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List pending applications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('waitlist')
        .setDescription('List waitlisted applications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve an application')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Application ID')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Deny an application')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Application ID')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('waitlist_app')
        .setDescription('Waitlist an application')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Application ID')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check the status of your application')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const [mappingResult] = await sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        { 
          bind: [discordGuildId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!mappingResult) {
        return await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
      }
      
      const guildId = mappingResult.app_guild_id;
      
      // Get user from discord ID for non-list commands
      const subcommand = interaction.options.getSubcommand();
      let userId = null;
      
      if (subcommand !== 'list' && subcommand !== 'waitlist') {
        const [userResult] = await sequelize.query(
          `SELECT id, username FROM users WHERE discord_id = $1`,
          { 
            bind: [interaction.user.id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!userResult) {
          return await interaction.editReply({
            content: 'You need to register on the website first before using this command.',
            ephemeral: true
          });
        }
        
        userId = userResult.id;
      }
      
      // Check if user has admin role for admin-only commands
      if (['list', 'waitlist', 'approve', 'deny', 'waitlist_app'].includes(subcommand)) {
        const [memberResult] = await sequelize.query(
          `SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
          { 
            bind: [guildId, userId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        const hasAdminRole = memberResult && ['Guild Master', 'Guild Advisor'].includes(memberResult.role);
        
        if (!hasAdminRole) {
          return await interaction.editReply({
            content: 'Only guild officers can use this command.',
            ephemeral: true
          });
        }
      }
      
      // Handle subcommands
      if (subcommand === 'submit') {
        // Check if user is already a member of this guild
        const [membershipResult] = await sequelize.query(
          `SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
          { 
            bind: [guildId, userId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (membershipResult) {
          return await interaction.editReply({
            content: 'You are already a member of this guild.',
            ephemeral: true
          });
        }
        
        // Check if there's already a pending application
        const [existingAppResult] = await sequelize.query(
          `SELECT id, status FROM guild_applications 
           WHERE user_id = $1 AND guild_id = $2 AND status IN ('PENDING', 'WAITLISTED')`,
          { 
            bind: [userId, guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (existingAppResult) {
          return await interaction.editReply({
            content: `You already have an active application with status: ${existingAppResult.status}.`,
            ephemeral: true
          });
        }
        
        // Get form data
        const inGameName = interaction.options.getString('ingame_name');
        const questlogLink = interaction.options.getString('questlog_link') || '';
        const previousGuilds = interaction.options.getString('previous_guilds');
        const leaveReason = interaction.options.getString('leave_reason') || '';
        const combatPower = interaction.options.getInteger('combat_power');
        const screenshot = interaction.options.getAttachment('screenshot');
        
        // Process screenshot if provided
        let screenshotUrl = null;
        if (screenshot) {
          // Validate it's an image
          if (!screenshot.contentType.startsWith('image/')) {
            return await interaction.editReply({
              content: 'The screenshot must be an image file.',
              ephemeral: true
            });
          }
          
          // Download the image
          const response = await axios.get(screenshot.url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          
          // Save the image
          const uploadsDir = ensureScreenshotsDir();
          const fileName = `${uuidv4()}${path.extname(screenshot.name || '.jpg')}`;
          const filePath = path.join(uploadsDir, fileName);
          screenshotUrl = `/uploads/screenshots/${fileName}`;
          
          fs.writeFileSync(filePath, buffer);
        }
        
        // Create the application
        const [applicationResult] = await sequelize.query(
          `INSERT INTO guild_applications 
           (id, guild_id, user_id, in_game_name, questlog_link, previous_guilds, leave_reason, 
            combat_power, screenshot_url, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW(), NOW())
           RETURNING id`,
          { 
            bind: [guildId, userId, inGameName, questlogLink, previousGuilds, leaveReason, 
                   combatPower, screenshotUrl],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        // Update username if different from in-game name
        await sequelize.query(
          `UPDATE users SET username = $1 WHERE id = $2 AND username != $1`,
          { 
            bind: [inGameName, userId]
          }
        );
        
        // Send notification to configured application channel
        const [channelConfigResult] = await sequelize.query(
          `SELECT channel_id FROM discord_channel_config 
           WHERE guild_id = $1 AND channel_type = 'applications' AND enabled = true
           LIMIT 1`,
          { 
            bind: [guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        let notificationSent = false;
        
        if (channelConfigResult) {
          try {
            const channel = await interaction.client.channels.fetch(channelConfigResult.channel_id);
            
            const embed = new EmbedBuilder()
              .setTitle('New Guild Application')
              .setDescription(`**${inGameName}** has applied to join the guild.`)
              .addFields(
                { name: 'Combat Power', value: combatPower.toString(), inline: true },
                { name: 'Previous Guilds', value: previousGuilds, inline: true },
                { name: 'Application ID', value: applicationResult.id, inline: false }
              )
              .setColor('#0099ff')
              .setTimestamp();
            
            if (leaveReason) {
              embed.addFields({ name: 'Reason for Leaving', value: leaveReason });
            }
            
            if (questlogLink) {
              embed.addFields({ name: 'Questlog Link', value: questlogLink });
            }
            
            if (screenshot) {
              embed.setImage(screenshot.url);
            }
            
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`approve_app_${applicationResult.id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`deny_app_${applicationResult.id}`)
                  .setLabel('Deny')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`waitlist_app_${applicationResult.id}`)
                  .setLabel('Waitlist')
                  .setStyle(ButtonStyle.Primary)
              );
            
            await channel.send({ embeds: [embed], components: [row] });
            notificationSent = true;
          } catch (channelError) {
            console.error('Error sending to application channel:', channelError);
          }
        }
        
        // If no channel is configured, try to send to a general or system channel
        if (!notificationSent) {
          try {
            // Look for any configured channel
            const [anyChannelResult] = await sequelize.query(
              `SELECT channel_id FROM discord_channel_config 
               WHERE guild_id = $1 AND enabled = true
               LIMIT 1`,
              { 
                bind: [guildId],
                type: sequelize.QueryTypes.SELECT
              }
            );
            
            if (anyChannelResult) {
              const channel = await interaction.client.channels.fetch(anyChannelResult.channel_id);
              
              const embed = new EmbedBuilder()
                .setTitle('New Guild Application')
                .setDescription(`**${inGameName}** has applied to join the guild.`)
                .addFields(
                  { name: 'Combat Power', value: combatPower.toString(), inline: true },
                  { name: 'Previous Guilds', value: previousGuilds, inline: true },
                  { name: 'Application ID', value: applicationResult.id, inline: false }
                )
                .setColor('#0099ff')
                .setTimestamp();
              
              if (leaveReason) {
                embed.addFields({ name: 'Reason for Leaving', value: leaveReason });
              }
              
              if (questlogLink) {
                embed.addFields({ name: 'Questlog Link', value: questlogLink });
              }
              
              if (screenshot) {
                embed.setImage(screenshot.url);
              }
              
              const row = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(`approve_app_${applicationResult.id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success),
                  new ButtonBuilder()
                    .setCustomId(`deny_app_${applicationResult.id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId(`waitlist_app_${applicationResult.id}`)
                    .setLabel('Waitlist')
                    .setStyle(ButtonStyle.Primary)
                );
              
              await channel.send({ embeds: [embed], components: [row] });
              notificationSent = true;
            }
          } catch (fallbackError) {
            console.error('Error sending to fallback channel:', fallbackError);
          }
        }
        
        return await interaction.editReply({
          content: `Application submitted successfully${notificationSent ? ' and officers have been notified.' : '.'}`,
          ephemeral: true
        });
      }
      else if (subcommand === 'list') {
        // Get pending applications
        const applicationsResult = await sequelize.query(
          `SELECT ga.*, u.username, u.discord_id 
           FROM guild_applications ga
           JOIN users u ON ga.user_id = u.id
           WHERE ga.guild_id = $1 AND ga.status = 'PENDING'
           ORDER BY ga.created_at DESC`,
          { 
            bind: [guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationsResult.length) {
          return await interaction.editReply({
            content: 'No pending applications found.',
            ephemeral: true
          });
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Pending Guild Applications')
          .setDescription(`Found ${applicationsResult.length} pending applications.`)
          .setColor('#0099ff')
          .setTimestamp();
        
        applicationsResult.forEach((app, index) => {
          embed.addFields({
            name: `#${index + 1} - ${app.in_game_name}`,
            value: `ID: ${app.id}\nCP: ${app.combat_power}\nSubmitted: ${new Date(app.created_at).toLocaleString()}`
          });
        });
        
        return await interaction.editReply({
          embeds: [embed],
          ephemeral: true
        });
      }
      else if (subcommand === 'waitlist') {
        // Get waitlisted applications
        const applicationsResult = await sequelize.query(
          `SELECT ga.*, u.username, u.discord_id 
           FROM guild_applications ga
           JOIN users u ON ga.user_id = u.id
           WHERE ga.guild_id = $1 AND ga.status = 'WAITLISTED'
           ORDER BY ga.waitlisted_at DESC`,
          { 
            bind: [guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationsResult.length) {
          return await interaction.editReply({
            content: 'No waitlisted applications found.',
            ephemeral: true
          });
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Waitlisted Guild Applications')
          .setDescription(`Found ${applicationsResult.length} waitlisted applications.`)
          .setColor('#0099ff')
          .setTimestamp();
        
        applicationsResult.forEach((app, index) => {
          embed.addFields({
            name: `#${index + 1} - ${app.in_game_name}`,
            value: `ID: ${app.id}\nCP: ${app.combat_power}\nWaitlisted: ${new Date(app.waitlisted_at).toLocaleString()}`
          });
        });
        
        return await interaction.editReply({
          embeds: [embed],
          ephemeral: true
        });
      }
      else if (subcommand === 'approve') {
        const applicationId = interaction.options.getString('id');
        
        // Find the application
        const [applicationResult] = await sequelize.query(
          `SELECT ga.*, u.username, u.discord_id 
           FROM guild_applications ga
           JOIN users u ON ga.user_id = u.id
           WHERE ga.id = $1 AND ga.guild_id = $2`,
          { 
            bind: [applicationId, guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationResult) {
          return await interaction.editReply({
            content: 'Application not found.',
            ephemeral: true
          });
        }
        
        // Add user to guild
        await sequelize.query(
          `INSERT INTO guild_members 
           (id, guild_id, user_id, role, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'Guild Member', NOW(), NOW())
           ON CONFLICT (guild_id, user_id) DO NOTHING`,
          { 
            bind: [guildId, applicationResult.user_id]
          }
        );
        
        // Update application status
        await sequelize.query(
          `UPDATE guild_applications 
           SET status = 'APPROVED', processed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          { 
            bind: [userId, applicationId]
          }
        );
        
        // Try to notify the user
        if (applicationResult.discord_id) {
          try {
            const user = await interaction.client.users.fetch(applicationResult.discord_id);
            await user.send(`Congratulations! Your application to join the guild has been approved.`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
          }
        }
        
        // Update the original message if possible
        try {
          const message = interaction.message;
          if (message) {
            const embed = EmbedBuilder.from(message.embeds[0])
              .setColor('#00ff00')
              .setTitle('Guild Application - APPROVED')
              .addFields({ name: 'Approved By', value: interaction.user.username, inline: true });
            
            await message.edit({ embeds: [embed], components: [] });
          }
        } catch (messageError) {
          // Message may have been deleted or not available
          console.error('Error updating application message:', messageError);
        }
        
        return await interaction.editReply({
          content: `Application for ${applicationResult.in_game_name} approved successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'deny') {
        const applicationId = interaction.options.getString('id');
        
        // Find the application
        const [applicationResult] = await sequelize.query(
          `SELECT ga.*, u.username, u.discord_id 
           FROM guild_applications ga
           JOIN users u ON ga.user_id = u.id
           WHERE ga.id = $1 AND ga.guild_id = $2`,
          { 
            bind: [applicationId, guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationResult) {
          return await interaction.editReply({
            content: 'Application not found.',
            ephemeral: true
          });
        }
        
        // Update application status
        await sequelize.query(
          `UPDATE guild_applications 
           SET status = 'DENIED', processed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          { 
            bind: [userId, applicationId]
          }
        );
        
        // Try to notify the user
        if (applicationResult.discord_id) {
          try {
            const user = await interaction.client.users.fetch(applicationResult.discord_id);
            await user.send(`Your application to join the guild has been denied.`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
          }
        }
        
        // Update the original message if possible
        try {
          const message = interaction.message;
          if (message) {
            const embed = EmbedBuilder.from(message.embeds[0])
              .setColor('#ff0000')
              .setTitle('Guild Application - DENIED')
              .addFields({ name: 'Denied By', value: interaction.user.username, inline: true });
            
            await message.edit({ embeds: [embed], components: [] });
          }
        } catch (messageError) {
          // Message may have been deleted or not available
          console.error('Error updating application message:', messageError);
        }
        
        return await interaction.editReply({
          content: `Application for ${applicationResult.in_game_name} denied successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'waitlist_app') {
        const applicationId = interaction.options.getString('id');
        
        // Find the application
        const [applicationResult] = await sequelize.query(
          `SELECT ga.*, u.username, u.discord_id 
           FROM guild_applications ga
           JOIN users u ON ga.user_id = u.id
           WHERE ga.id = $1 AND ga.guild_id = $2`,
          { 
            bind: [applicationId, guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationResult) {
          return await interaction.editReply({
            content: 'Application not found.',
            ephemeral: true
          });
        }
        
        // Update application status
        await sequelize.query(
          `UPDATE guild_applications 
           SET status = 'WAITLISTED', waitlisted_at = NOW(), processed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          { 
            bind: [userId, applicationId]
          }
        );
        
        // Try to notify the user
        if (applicationResult.discord_id) {
          try {
            const user = await interaction.client.users.fetch(applicationResult.discord_id);
            await user.send(`Your application to join the guild has been waitlisted. You may be contacted when a spot becomes available.`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
          }
        }
        
        // Update the original message if possible
        try {
          const message = interaction.message;
          if (message) {
            const embed = EmbedBuilder.from(message.embeds[0])
              .setColor('#0099ff')
              .setTitle('Guild Application - WAITLISTED')
              .addFields({ name: 'Waitlisted By', value: interaction.user.username, inline: true });
            
            await message.edit({ embeds: [embed], components: [] });
          }
        } catch (messageError) {
          // Message may have been deleted or not available
          console.error('Error updating application message:', messageError);
        }
        
        return await interaction.editReply({
          content: `Application for ${applicationResult.in_game_name} waitlisted successfully.`,
          ephemeral: true
        });
      }
      else if (subcommand === 'status') {
        // Get status for current user
        const [applicationResult] = await sequelize.query(
          `SELECT * FROM guild_applications 
           WHERE user_id = $1 AND guild_id = $2
           ORDER BY created_at DESC LIMIT 1`,
          { 
            bind: [userId, guildId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!applicationResult) {
          return await interaction.editReply({
            content: 'You have not submitted an application to this guild.',
            ephemeral: true
          });
        }
        
        const statusMap = {
          'PENDING': '⏳ Pending - Your application is being reviewed',
          'APPROVED': '✅ Approved - You have been accepted into the guild',
          'DENIED': '❌ Denied - Your application has been rejected',
          'WAITLISTED': '📝 Waitlisted - You will be contacted when a spot opens up'
        };
        
        const statusText = statusMap[applicationResult.status] || applicationResult.status;
        
        const embed = new EmbedBuilder()
          .setTitle('Your Application Status')
          .setDescription(`Current status: ${statusText}`)
          .addFields(
            { name: 'In-Game Name', value: applicationResult.in_game_name, inline: true },
            { name: 'Combat Power', value: applicationResult.combat_power.toString(), inline: true },
            { name: 'Submitted', value: new Date(applicationResult.created_at).toLocaleString(), inline: true }
          )
          .setColor(
            applicationResult.status === 'APPROVED' ? '#00ff00' : 
            applicationResult.status === 'DENIED' ? '#ff0000' : 
            applicationResult.status === 'WAITLISTED' ? '#0099ff' : '#ffff00'
          )
          .setTimestamp();
        
        if (applicationResult.screenshot_url && applicationResult.screenshot_url !== '') {
          try {
            // Convert relative path to full URL
            const baseUrl = process.env.API_URL || 'https://tevent.app';
            const imageUrl = `${baseUrl}${applicationResult.screenshot_url}`;
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
    } catch (error) {
      console.error('Error executing application command:', error);
      return await interaction.editReply({
        content: 'An error occurred while processing your request.',
        ephemeral: true
      });
    }
  },
  
  // Handle button interactions related to applications
  async handleButtons(interaction) {
    if (!interaction.isButton()) return false;
    
    const customId = interaction.customId;
    
    // Check if this is an application button
    if (!customId.startsWith('approve_app_') && 
        !customId.startsWith('deny_app_') && 
        !customId.startsWith('waitlist_app_')) {
      return false;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const [mappingResult] = await sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        { 
          bind: [discordGuildId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!mappingResult) {
        await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
        return true;
      }
      
      const guildId = mappingResult.app_guild_id;
      
      // Get user from discord ID
      const [userResult] = await sequelize.query(
        `SELECT id, username FROM users WHERE discord_id = $1`,
        { 
          bind: [interaction.user.id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!userResult) {
        await interaction.editReply({
          content: 'You need to register on the website first before using this function.',
          ephemeral: true
        });
        return true;
      }
      
      // Check if user has admin role
      const [memberResult] = await sequelize.query(
        `SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
        { 
          bind: [guildId, userResult.id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      const hasAdminRole = memberResult && ['Guild Master', 'Guild Advisor'].includes(memberResult.role);
      
      if (!hasAdminRole) {
        await interaction.editReply({
          content: 'Only guild officers can approve, deny, or waitlist applications.',
          ephemeral: true
        });
        return true;
      }
      
      // Extract application ID from button ID
      const applicationId = customId.replace('approve_app_', '')
                                   .replace('deny_app_', '')
                                   .replace('waitlist_app_', '');
      
      // Find the application
      const [applicationResult] = await sequelize.query(
        `SELECT ga.*, u.username, u.discord_id 
         FROM guild_applications ga
         JOIN users u ON ga.user_id = u.id
         WHERE ga.id = $1 AND ga.guild_id = $2`,
        { 
          bind: [applicationId, guildId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!applicationResult) {
        await interaction.editReply({
          content: 'Application not found.',
          ephemeral: true
        });
        return true;
      }
      
      if (customId.startsWith('approve_app_')) {
        // Add user to guild
        await sequelize.query(
          `INSERT INTO guild_members 
           (id, guild_id, user_id, role, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'Guild Member', NOW(), NOW())
           ON CONFLICT (guild_id, user_id) DO NOTHING`,
          { 
            bind: [guildId, applicationResult.user_id]
          }
        );
        
        // Update application status
        await sequelize.query(
          `UPDATE guild_applications 
           SET status = 'APPROVED', processed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          { 
            bind: [userResult.id, applicationId]
          }
        );
        
        // Try to notify the user
        if (applicationResult.discord_id) {
          try {
            const user = await interaction.client.users.fetch(applicationResult.discord_id);
            await user.send(`Congratulations! Your application to join the guild has been approved.`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
          }
        }
        
        // Update the message
        try {
          const message = interaction.message;
          const embed = EmbedBuilder.from(message.embeds[0])
            .setColor('#00ff00')
            .setTitle('Guild Application - APPROVED')
            .addFields({ name: 'Approved By', value: interaction.user.username, inline: true });
          
          await message.edit({ embeds: [embed], components: [] });
        } catch (messageError) {
          console.error('Error updating message:', messageError);
        }
        
        await interaction.editReply({
          content: `Application for ${applicationResult.in_game_name} approved successfully.`,
          ephemeral: true
        });
      } 
      else if (customId.startsWith('deny_app_')) {
        // Create a modal for denial reason
        const modal = {
          title: 'Deny Application',
          custom_id: `deny_app_modal_${applicationId}`,
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'denial_reason',
              label: 'Reason for denial (optional)',
              style: 2,
              min_length: 0,
              max_length: 1000,
              placeholder: 'Optional reason for denial',
              required: false
            }]
          }]
        };
        
        await interaction.showModal(modal);
      }
      else if (customId.startsWith('waitlist_app_')) {
        // Update application status
        await sequelize.query(
          `UPDATE guild_applications 
           SET status = 'WAITLISTED', waitlisted_at = NOW(), processed_by = $1, updated_at = NOW()
           WHERE id = $2`,
          { 
            bind: [userResult.id, applicationId]
          }
        );
        
        // Try to notify the user
        if (applicationResult.discord_id) {
          try {
            const user = await interaction.client.users.fetch(applicationResult.discord_id);
            await user.send(`Your application to join the guild has been waitlisted. You may be contacted when a spot becomes available.`);
          } catch (dmError) {
            console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
          }
        }
        
        // Update the message
        try {
          const message = interaction.message;
          const embed = EmbedBuilder.from(message.embeds[0])
            .setColor('#0099ff')
            .setTitle('Guild Application - WAITLISTED')
            .addFields({ name: 'Waitlisted By', value: interaction.user.username, inline: true });
          
          await message.edit({ embeds: [embed], components: [] });
        } catch (messageError) {
          console.error('Error updating message:', messageError);
        }
        
        await interaction.editReply({
          content: `Application for ${applicationResult.in_game_name} waitlisted successfully.`,
          ephemeral: true
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error handling application button:', error);
      await interaction.editReply({
        content: 'An error occurred while processing the button.',
        ephemeral: true
      });
      return true;
    }
  },

  // Handle modal submissions for application denials
  async handleModals(interaction) {
    if (!interaction.isModalSubmit()) return false;
    
    const customId = interaction.customId;
    
    // Check if this is an application modal
    if (!customId.startsWith('deny_app_modal_')) {
      return false;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Extract application ID from modal ID
      const applicationId = customId.replace('deny_app_modal_', '');
      
      // Get app guild ID from mapping
      const discordGuildId = interaction.guildId;
      
      const [mappingResult] = await sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1`,
        { 
          bind: [discordGuildId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!mappingResult) {
        await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true
        });
        return true;
      }
      
      const guildId = mappingResult.app_guild_id;
      
      // Get user from discord ID
      const [userResult] = await sequelize.query(
        `SELECT id FROM users WHERE discord_id = $1`,
        { 
          bind: [interaction.user.id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!userResult) {
        await interaction.editReply({
          content: 'You need to register on the website first before using this function.',
          ephemeral: true
        });
        return true;
      }
      
      // Get denial reason from modal (optional)
      const reason = interaction.fields.getTextInputValue('denial_reason');
      
      // Find the application
      const [applicationResult] = await sequelize.query(
        `SELECT ga.*, u.username, u.discord_id 
         FROM guild_applications ga
         JOIN users u ON ga.user_id = u.id
         WHERE ga.id = $1 AND ga.guild_id = $2`,
        { 
          bind: [applicationId, guildId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!applicationResult) {
        await interaction.editReply({
          content: 'Application not found.',
          ephemeral: true
        });
        return true;
      }
      
      // Update application status
      await sequelize.query(
        `UPDATE guild_applications 
         SET status = 'DENIED', processed_by = $1, updated_at = NOW()
         WHERE id = $2`,
        { 
          bind: [userResult.id, applicationId]
        }
      );
      
      // Try to notify the user
      if (applicationResult.discord_id) {
        try {
          const user = await interaction.client.users.fetch(applicationResult.discord_id);
          let message = `Your application to join the guild has been denied.`;
          if (reason) {
            message += ` Reason: ${reason}`;
          }
          await user.send(message);
        } catch (dmError) {
          console.error(`Could not send DM to user ${applicationResult.discord_id}:`, dmError);
        }
      }
      
      // Update the message
      try {
        const message = interaction.message;
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor('#ff0000')
          .setTitle('Guild Application - DENIED')
          .addFields({ name: 'Denied By', value: interaction.user.username, inline: true });
        
        if (reason) {
          embed.addFields({ name: 'Reason', value: reason });
        }
        
        await message.edit({ embeds: [embed], components: [] });
      } catch (messageError) {
        console.error('Error updating message:', messageError);
      }
      
      await interaction.editReply({
        content: `Application for ${applicationResult.in_game_name} denied successfully.`,
        ephemeral: true
      });
      
      return true;
    } catch (error) {
      console.error('Error handling application modal:', error);
      await interaction.editReply({
        content: 'An error occurred while processing the modal submission.',
        ephemeral: true
      });
      return true;
    }
  }
};