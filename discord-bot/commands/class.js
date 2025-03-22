// discord-bot/commands/class.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { sequelize } = require('../../../config/database');

// Define available weapon specs and their class names
const WEAPON_SPECS = {
  'Crossbow|Dagger': 'Scorpion',
  'Crossbow|Greatsword': 'Outrider',
  'Crossbow|Sword and Shield': 'Raider',
  'Crossbow|Bow': 'Scout',
  'Crossbow|Staff': 'Battleweaver',
  'Crossbow|Wand': 'Fury',
  'Greatsword|Wand': 'Paladin',
  'Greatsword|Dagger': 'Ravager',
  'Greatsword|Sword and Shield': 'Crusader',
  'Greatsword|Bow': 'Ranger',
  'Greatsword|Staff': 'Sentinel',
  'Sword and Shield|Dagger': 'Berserker',
  'Sword and Shield|Bow': 'Warden',
  'Sword and Shield|Staff': 'Disciple',
  'Sword and Shield|Wand': 'Templar',
  'Bow|Dagger': 'Infiltrator',
  'Bow|Staff': 'Liberator',
  'Bow|Wand': 'Seeker',
  'Staff|Dagger': 'Spellblade',
  'Staff|Wand': 'Invocator',
  'Wand|Dagger': 'Darkblighter',
  'Spear|Greatsword': 'Gladiator',
  'Spear|Sword and Shield': 'Steelheart',
  'Spear|Staff': 'Eradicator',
  'Spear|Dagger': 'Shadowdancer',
  'Spear|Crossbow': 'Cavalier',
  'Spear|Wand': 'Voidlance',
  'Spear|Bow': 'Impaler'
};

// Helper function to ensure the user_preferences table exists
async function ensureUserPreferencesTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        preferred_weapon_spec VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    return true;
  } catch (error) {
    console.error('Error creating user_preferences table:', error);
    return false;
  }
}

// Helper function to get available classes for a user based on their builds
async function getAvailableClasses(userId) {
    try {
      // Get user builds from database
      const userResult = await sequelize.query(
        `SELECT builds FROM users WHERE id = $1`,
        { 
          bind: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!userResult.length || !userResult[0].builds) {
        return [];
      }
      
      // Parse builds data
      let builds;
      try {
        builds = typeof userResult[0].builds === 'string' 
          ? JSON.parse(userResult[0].builds) 
          : userResult[0].builds;
      } catch (e) {
        console.error('Error parsing builds:', e);
        return [];
      }
      
      if (!Array.isArray(builds) || builds.length === 0) {
        return [];
      }
      
      console.log(`[DEBUG] User builds: ${JSON.stringify(builds)}`);
      
      // Extract available classes from builds
      const availableClasses = [];
      const seenClasses = new Set();
      
      builds.forEach(build => {
        // Check if build has weapon_spec directly
        if (build.weapon_spec && WEAPON_SPECS[`${build.primary}|${build.secondary}`] === build.weapon_spec) {
          const weaponCombo = `${build.primary}|${build.secondary}`;
          if (!seenClasses.has(build.weapon_spec)) {
            availableClasses.push({
              weaponCombo: weaponCombo,
              className: build.weapon_spec,
              spec: build.spec || 'Any'
            });
            seenClasses.add(build.weapon_spec);
          }
        }
        // Try reverse order of weapons too
        else if (build.weapon_spec && WEAPON_SPECS[`${build.secondary}|${build.primary}`] === build.weapon_spec) {
          const weaponCombo = `${build.secondary}|${build.primary}`;
          if (!seenClasses.has(build.weapon_spec)) {
            availableClasses.push({
              weaponCombo: weaponCombo,
              className: build.weapon_spec,
              spec: build.spec || 'Any'
            });
            seenClasses.add(build.weapon_spec);
          }
        }
        // Fallback to checking weapon combinations
        else if (build.primary && build.secondary) {
          const combo1 = `${build.primary}|${build.secondary}`;
          const combo2 = `${build.secondary}|${build.primary}`;
          
          if (WEAPON_SPECS[combo1] && !seenClasses.has(WEAPON_SPECS[combo1])) {
            availableClasses.push({
              weaponCombo: combo1,
              className: WEAPON_SPECS[combo1],
              spec: build.spec || 'Any'
            });
            seenClasses.add(WEAPON_SPECS[combo1]);
          }
          else if (WEAPON_SPECS[combo2] && !seenClasses.has(WEAPON_SPECS[combo2])) {
            availableClasses.push({
              weaponCombo: combo2,
              className: WEAPON_SPECS[combo2],
              spec: build.spec || 'Any'
            });
            seenClasses.add(WEAPON_SPECS[combo2]);
          }
        }
      });
      
      console.log(`[DEBUG] Available classes: ${JSON.stringify(availableClasses)}`);
      return availableClasses;
    } catch (error) {
      console.error('Error getting available classes:', error);
      return [];
    }
  }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('View or set your preferred character class')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current preferred class')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your preferred class')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset your preferred class')
    ),

  async execute(interaction) {
    // Make sure the preferences table exists
    if (!await ensureUserPreferencesTable()) {
      return interaction.reply({ 
        content: 'Unable to access preferences database. Please try again later.',
        ephemeral: true 
      });
    }

    try {
      const subcommand = interaction.options.getSubcommand();
      const discordUserId = interaction.user.id;
      
      // Get user from Discord ID
      const userResult = await sequelize.query(
        `SELECT id, username FROM users WHERE discord_id = $1`,
        { 
          bind: [discordUserId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!userResult.length) {
        return interaction.reply({ 
          content: 'You must register on the website first before using this command.',
          ephemeral: true 
        });
      }
      
      const userId = userResult[0].id;
      const username = userResult[0].username;
      
      if (subcommand === 'view') {
        // Get user's current preference
        const prefResult = await sequelize.query(
          `SELECT preferred_weapon_spec FROM user_preferences WHERE user_id = $1`,
          { 
            bind: [userId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!prefResult.length || !prefResult[0].preferred_weapon_spec) {
          return interaction.reply({ 
            content: `You haven't set a preferred class yet. Use \`/class set\` to choose one.`,
            ephemeral: true 
          });
        }
        
        const weaponSpec = prefResult[0].preferred_weapon_spec;
        const className = WEAPON_SPECS[weaponSpec] || 'Unknown';
        
        const weapons = weaponSpec.split('|');
        const embed = new EmbedBuilder()
          .setTitle(`${username}'s Preferred Class`)
          .setDescription(`You have selected the **${className}** class.`)
          .addFields(
            { name: 'Weapons', value: `${weapons[0]} + ${weapons[1]}`, inline: true },
            { name: 'To Change', value: 'Use `/class set` to choose a different class.', inline: true }
          )
          .setColor('#4CAF50');
        
        return interaction.reply({ 
          embeds: [embed],
          ephemeral: true 
        });
      }
      else if (subcommand === 'reset') {
        // Reset user's preference
        await sequelize.query(
          `DELETE FROM user_preferences WHERE user_id = $1`,
          { 
            bind: [userId]
          }
        );
        
        return interaction.reply({ 
          content: `Your preferred class has been reset. You can set a new one with \`/class set\`.`,
          ephemeral: true 
        });
      }
      else if (subcommand === 'set') {
        // Get available classes for this user
        const availableClasses = await getAvailableClasses(userId);
        
        if (!availableClasses.length) {
          return interaction.reply({ 
            content: `No available classes found for you. Please make sure you have builds configured on the website.`,
            ephemeral: true 
          });
        }
        
        // Create selection menu
        const options = availableClasses.map(c => ({
          label: c.className,
          description: `${c.weaponCombo.replace('|', ' + ')}`,
          value: c.weaponCombo
        }));
        
        const row = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`class_select_${userId}`)
              .setPlaceholder('Select your preferred class')
              .addOptions(options)
          );
        
        await interaction.reply({
          content: 'Choose your preferred class from the menu below:',
          components: [row],
          ephemeral: true
        });
        
        // Setup collector for the response
        const filter = i => 
          i.customId === `class_select_${userId}` && 
          i.user.id === interaction.user.id;
        
        const collector = interaction.channel.createMessageComponentCollector({ 
          filter, 
          time: 60000, // 1 minute timeout
          max: 1 
        });
        
        collector.on('collect', async i => {
          const selectedWeaponCombo = i.values[0];
          const selectedClassName = WEAPON_SPECS[selectedWeaponCombo] || 'Unknown';
          
          // Save the preference
          await sequelize.query(
            `INSERT INTO user_preferences (user_id, preferred_weapon_spec)
             VALUES ($1, $2)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
               preferred_weapon_spec = $2,
               updated_at = NOW()`,
            { 
              bind: [userId, selectedWeaponCombo]
            }
          );
          
          const weapons = selectedWeaponCombo.split('|');
          const embed = new EmbedBuilder()
            .setTitle(`Class Preference Set`)
            .setDescription(`You've selected the **${selectedClassName}** class.`)
            .addFields(
              { name: 'Weapons', value: `${weapons[0]} + ${weapons[1]}`, inline: true },
              { name: 'Applied To', value: 'This will be used for future event signups.', inline: true }
            )
            .setColor('#4CAF50');
          
          await i.update({ 
            content: 'Class preference saved!',
            embeds: [embed],
            components: [] 
          });
        });
        
        collector.on('end', collected => {
          if (collected.size === 0) {
            interaction.editReply({
              content: 'Class selection timed out. Please try again.',
              components: []
            }).catch(console.error);
          }
        });
      }
    } catch (error) {
      console.error('Error in class command:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing the command.',
        ephemeral: true
      });
    }
  }
};