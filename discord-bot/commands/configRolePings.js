const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Pool } = require('pg');

// Initialize with the global pool (will be replaced if needed)
let pool;

/**
 * Command to configure which roles should be pinged for different notification types
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-role-pings')
    .setDescription('Configure which roles to ping for different notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('events')
        .setDescription('Configure roles to ping for new events')
        .addRoleOption(option => 
          option.setName('role')
                .setDescription('Role to ping (leave empty to view current setting)')
                .setRequired(false))
        .addBooleanOption(option =>
          option.setName('enabled')
                .setDescription('Enable or disable pinging')
                .setRequired(false))
        .addBooleanOption(option =>
          option.setName('add')
                .setDescription('Add this role to existing roles (default: replace all)')
                .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('storage')
        .setDescription('Configure roles to ping for new storage items')
        .addRoleOption(option => 
          option.setName('role')
                .setDescription('Role to ping (leave empty to view current setting)')
                .setRequired(false))
        .addBooleanOption(option =>
          option.setName('enabled')
                .setDescription('Enable or disable pinging')
                .setRequired(false))
        .addBooleanOption(option =>
          option.setName('add')
                .setDescription('Add this role to existing roles (default: replace all)')
                .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset role ping configuration')
        .addStringOption(option =>
          option.setName('type')
                .setDescription('Type of notification to reset')
                .setRequired(true)
                .addChoices(
                  { name: 'Events', value: 'events' },
                  { name: 'Storage', value: 'storage' },
                  { name: 'All', value: 'all' }
                ))),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get Discord guild ID
      const discordGuildId = interaction.guild.id;
      
      // Get app guild ID from database
      const appGuildId = await getGuildMapping(discordGuildId);
      
      if (!appGuildId) {
        return await interaction.editReply({ 
          content: 'This Discord server is not linked to an application guild.',
          ephemeral: true 
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'reset') {
        return handleResetCommand(interaction, appGuildId);
      } else {
        return handleConfigureCommand(interaction, appGuildId, subcommand);
      }
    } catch (error) {
      console.error(`[ERROR] Error in config-role-pings command:`, error);
      return await interaction.editReply({ 
        content: `An error occurred: ${error.message}`,
        ephemeral: true 
      });
    }
  },
  
  // Method to update the pool reference if needed
  setPool(dbPool) {
    if (dbPool) {
      pool = dbPool;
    }
  }
};

/**
 * Get application guild ID from Discord guild ID
 */
async function getGuildMapping(discordGuildId) {
  try {
    const result = await pool.query(
      'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
      [discordGuildId]
    );
    
    return result.rows.length > 0 ? result.rows[0].app_guild_id : null;
  } catch (error) {
    console.error(`[ERROR] Error getting guild mapping:`, error);
    return null;
  }
}

/**
 * Handle the reset subcommand
 */
async function handleResetCommand(interaction, appGuildId) {
  const type = interaction.options.getString('type');
  
  try {
    if (type === 'all') {
      await pool.query(
        `UPDATE discord_role_ping_config 
         SET role_ids = '{}'::TEXT[], enabled = true, updated_at = NOW()
         WHERE guild_id = $1`,
        [appGuildId]
      );
      
      return await interaction.editReply({ 
        content: 'All role ping configurations have been reset.',
        ephemeral: true 
      });
    } else {
      await pool.query(
        `UPDATE discord_role_ping_config 
         SET role_ids = '{}'::TEXT[], enabled = true, updated_at = NOW()
         WHERE guild_id = $1 AND type = $2`,
        [appGuildId, type]
      );
      
      return await interaction.editReply({ 
        content: `Role ping configuration for ${type} has been reset.`,
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error(`[ERROR] Error resetting role pings:`, error);
    return await interaction.editReply({ 
      content: `An error occurred while resetting: ${error.message}`,
      ephemeral: true 
    });
  }
}

/**
 * Handle the configure subcommands (events, storage)
 */
async function handleConfigureCommand(interaction, appGuildId, type) {
  const role = interaction.options.getRole('role');
  const enabled = interaction.options.getBoolean('enabled');
  const addRole = interaction.options.getBoolean('add');
  
  // If no options provided, show current configuration
  if (!role && enabled === null) {
    return showCurrentConfig(interaction, appGuildId, type);
  }
  
  try {
    // Make sure the config exists
    await ensureConfigExists(appGuildId, type);
    
    // Update enabled status if provided
    if (enabled !== null) {
      await pool.query(
        `UPDATE discord_role_ping_config 
         SET enabled = $1, updated_at = NOW()
         WHERE guild_id = $2 AND type = $3`,
        [enabled, appGuildId, type]
      );
    }
    
    // Update role_ids if a role was provided
    if (role) {
      if (addRole) {
        // Add this role to existing roles
        await pool.query(
          `UPDATE discord_role_ping_config 
           SET role_ids = array_append(role_ids, $1), updated_at = NOW()
           WHERE guild_id = $2 AND type = $3 AND NOT $1 = ANY(role_ids)`,
          [role.id, appGuildId, type]
        );
      } else {
        // Replace existing roles with just this one
        await pool.query(
          `UPDATE discord_role_ping_config 
           SET role_ids = ARRAY[$1]::TEXT[], updated_at = NOW()
           WHERE guild_id = $2 AND type = $3`,
          [role.id, appGuildId, type]
        );
      }
    }
    
    // Show updated configuration
    return showCurrentConfig(interaction, appGuildId, type);
  } catch (error) {
    console.error(`[ERROR] Error updating role pings:`, error);
    return await interaction.editReply({ 
      content: `An error occurred while updating: ${error.message}`,
      ephemeral: true 
    });
  }
}

/**
 * Show the current role ping configuration
 */
async function showCurrentConfig(interaction, appGuildId, type) {
  try {
    const result = await pool.query(
      `SELECT * FROM discord_role_ping_config 
       WHERE guild_id = $1 AND type = $2`,
      [appGuildId, type]
    );
    
    if (!result.rows.length) {
      await ensureConfigExists(appGuildId, type);
      return await interaction.editReply({ 
        content: `No configuration found for ${type}. A default configuration has been created.`,
        ephemeral: true 
      });
    }
    
    const config = result.rows[0];
    const roleIds = config.role_ids || [];
    
    let rolesList = '';
    if (roleIds.length === 0) {
      rolesList = 'No roles configured';
    } else {
      rolesList = roleIds.map(id => `<@&${id}>`).join(', ');
    }
    
    const statusText = config.enabled ? 'Enabled' : 'Disabled';
    const typeFormatted = type.charAt(0).toUpperCase() + type.slice(1);
    
    return await interaction.editReply({ 
      content: `**${typeFormatted} Role Ping Configuration**\n\nStatus: ${statusText}\nRoles: ${rolesList}\n\nUse \`/config-role-pings ${type}\` with options to modify this configuration.`,
      ephemeral: false 
    });
  } catch (error) {
    console.error(`[ERROR] Error showing role ping config:`, error);
    return await interaction.editReply({ 
      content: `An error occurred while retrieving the configuration: ${error.message}`,
      ephemeral: true 
    });
  }
}

/**
 * Ensure a configuration exists for this guild and type
 */
async function ensureConfigExists(guildId, type) {
  try {
    // Check if config exists
    const result = await pool.query(
      `SELECT id FROM discord_role_ping_config 
       WHERE guild_id = $1 AND type = $2`,
      [guildId, type]
    );
    
    if (!result.rows.length) {
      // Create a default config
      await pool.query(
        `INSERT INTO discord_role_ping_config 
         (id, guild_id, type, role_ids, enabled, created_at, updated_at)
         VALUES 
         (gen_random_uuid(), $1, $2, '{}'::TEXT[], true, NOW(), NOW())`,
        [guildId, type]
      );
    }
  } catch (error) {
    console.error(`[ERROR] Error ensuring config exists:`, error);
    throw error;
  }
}
