const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const roleConfig = require('../utils/roleConfig');
const { Pool } = require('pg');

const roleTypes = [
  { id: 'events', name: 'Event Notifications', emoji: '📅', description: 'Pings when events are created' },
  { id: 'items', name: 'Item Notifications', emoji: '📦', description: 'Pings when items are added to storage' },
  { id: 'applications', name: 'Application Notifications', emoji: '📝', description: 'Pings when guild applications are received' },
  { id: 'gear_checks', name: 'Gear Check Notifications', emoji: '⚔️', description: 'Pings when gear checks are submitted' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configure-role-pings')
    .setDescription('Configure which roles to ping for different notification types')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to be pinged for a notification type')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of notification')
            .setRequired(true)
            .addChoices(
              { name: 'Event Notifications', value: 'events' },
              { name: 'Item Notifications', value: 'items' },
              { name: 'Application Notifications', value: 'applications' },
              { name: 'Gear Check Notifications', value: 'gear_checks' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to ping')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from being pinged for a notification type')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of notification')
            .setRequired(true)
            .addChoices(
              { name: 'Event Notifications', value: 'events' },
              { name: 'Item Notifications', value: 'items' },
              { name: 'Application Notifications', value: 'applications' },
              { name: 'Gear Check Notifications', value: 'gear_checks' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List current role ping configurations')),
    
  async execute(interaction, pool, guildId) {
    const subcommand = interaction.options.getSubcommand();
    
    // Check for admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: '❌ You need administrator permissions to configure role pings.',
        ephemeral: true
      });
    }
    
    try {
      // Initialize the roleConfig module with the pool
      if (roleConfig.setPool) {
        roleConfig.setPool(pool);
      }
      
      // Ensure tables exist
      await roleConfig.initDatabase();
      
      // Get Discord guild ID
      const discordGuildId = interaction.guild.id;
      
      if (subcommand === 'list') {
        // Get current configurations
        const configurations = await roleConfig.listRoleConfigurations(discordGuildId);
        
        // Create embed for current configurations
        const embed = new EmbedBuilder()
          .setTitle('Role Ping Configurations')
          .setDescription('Current roles configured to be pinged for notifications')
          .setColor('#0099ff')
          .setTimestamp();
        
        // Add fields for each role type
        for (const roleType of roleTypes) {
          const config = configurations.find(c => c.notification_type === roleType.id);
          
          let value = 'No roles configured';
          if (config && config.role_ids && config.role_ids.length > 0) {
            value = config.role_ids.map(id => `<@&${id}>`).join(', ');
          }
          
          embed.addFields({ 
            name: `${roleType.emoji} ${roleType.name}`, 
            value: value,
            inline: false
          });
        }
        
        return interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'add') {
        const notificationType = interaction.options.getString('type');
        const role = interaction.options.getRole('role');
        
        // Get current role configuration
        const configurations = await roleConfig.listRoleConfigurations(discordGuildId);
        const config = configurations.find(c => c.notification_type === notificationType);
        
        // Prepare role IDs array
        let roleIds = [];
        if (config && config.role_ids) {
          roleIds = [...config.role_ids];
        }
        
        // Check if role is already in the list
        if (roleIds.includes(role.id)) {
          return interaction.reply({
            content: `❌ Role ${role.name} is already configured to be pinged for ${notificationType} notifications.`,
            ephemeral: true
          });
        }
        
        // Add the role
        roleIds.push(role.id);
        
        // Save configuration
        const result = await roleConfig.configureRolePings(discordGuildId, guildId, notificationType, roleIds);
        
        if (result.success) {
          const roleType = roleTypes.find(rt => rt.id === notificationType);
          return interaction.reply({
            content: `✅ Role ${role.name} will now be pinged for ${roleType.name}.`,
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: `❌ Error: ${result.message}`,
            ephemeral: true
          });
        }
      }
      else if (subcommand === 'remove') {
        const notificationType = interaction.options.getString('type');
        const role = interaction.options.getRole('role');
        
        // Get current role configuration
        const configurations = await roleConfig.listRoleConfigurations(discordGuildId);
        const config = configurations.find(c => c.notification_type === notificationType);
        
        // Prepare role IDs array
        let roleIds = [];
        if (config && config.role_ids) {
          roleIds = [...config.role_ids];
        }
        
        // Check if role is in the list
        if (!roleIds.includes(role.id)) {
          return interaction.reply({
            content: `❌ Role ${role.name} is not configured to be pinged for ${notificationType} notifications.`,
            ephemeral: true
          });
        }
        
        // Remove the role
        roleIds = roleIds.filter(id => id !== role.id);
        
        // Save configuration
        const result = await roleConfig.configureRolePings(discordGuildId, guildId, notificationType, roleIds);
        
        if (result.success) {
          const roleType = roleTypes.find(rt => rt.id === notificationType);
          return interaction.reply({
            content: `✅ Role ${role.name} will no longer be pinged for ${roleType.name}.`,
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: `❌ Error: ${result.message}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error(`[ERROR] Error executing configure-role-pings command:`, error);
      return interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
