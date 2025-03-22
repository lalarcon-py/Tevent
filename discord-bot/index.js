// discord-bot/index.js
require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  REST, 
  Routes,
  Collection 
} = require('discord.js');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const embedBuilder = require('./utils/embed_builder');

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


console.log('Environment Check:', {
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'missing',
  TOKEN: process.env.DISCORD_BOT_TOKEN || 'missing',
  TOKEN_LENGTH: process.env.DISCORD_BOT_TOKEN ? process.env.DISCORD_BOT_TOKEN.length : 0
});

// New environment variables
const IS_DEV = process.env.NODE_ENV === 'development';
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;


const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()')
  .then(result => console.log("Database connection successful, server time:", result.rows[0].now))
  .catch(err => console.error("Database connection error:", err));

// Log connection info
console.log("Database connection configured");

// Create client with necessary intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent 
  ] 
});

function formatTimerDuration(minutes) {
  if (!minutes) return "Default (24h)";
  if (minutes === 5) return '5 Minutes';
  if (minutes === 60) return '1 Hour';
  if (minutes === 1440) return '24 Hours';
  if (minutes === 2880) return '48 Hours';
  if (minutes === 4320) return '72 Hours';
  return `${minutes} Minutes`;
}

// Helper function to calculate time remaining 
function calculateTimeRemaining(createdTime, durationMinutes) {
  if (!createdTime || !durationMinutes) return null;
  
  const creationDate = new Date(createdTime);
  const expirationTime = new Date(creationDate.getTime() + (durationMinutes * 60000));
  const now = new Date();
  const timeLeft = expirationTime - now;
  
  if (timeLeft <= 0) return "Expired - Roll pending";
  
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${hoursLeft}h ${minutesLeft}m`;
}

async function updateItemEmbed(itemId) {
  try {
    // Get message info
    const trackingResult = await pool.query(
      `SELECT * FROM item_message_tracking WHERE item_id = $1`,
      [itemId]
    );
    
    if (!trackingResult.rows.length) return false;
    const tracking = trackingResult.rows[0];
    
    // Get item details
    const itemResult = await pool.query(
      `SELECT gsi.*, i.name, i.type, i.icon 
       FROM guild_storage_items gsi
       JOIN items i ON gsi.item_id = i.id
       WHERE gsi.id = $1`,
      [itemId]
    );
    
    if (!itemResult.rows.length) return false;
    const item = itemResult.rows[0];
    
    // Get the message
    const channel = await client.channels.fetch(tracking.channel_id);
    if (!channel) return false;
    
    const message = await channel.messages.fetch(tracking.message_id);
    if (!message) return false;
    
    // Calculate time remaining for timer
    const timeRemaining = calculateTimeRemaining(item.created_at, item.timer_duration);
    
    // Create updated embed with counters
    const embed = new EmbedBuilder()
      .setTitle('Item Available')
      .setDescription(`Request this item using the buttons below:`)
      .addFields(
        { name: '📦 Item', value: `**${item.name}**`, inline: false },
        { name: 'Type', value: item.type || 'Unknown', inline: true },
        { name: 'Quantity', value: item.quantity.toString() || '0', inline: true },
        { name: 'DKP Cost', value: (item.dkp_cost || 0).toString(), inline: true },
        { 
          name: '⏰ Roll Timer',
          value: timeRemaining || formatTimerDuration(item.timer_duration || 1440),
          inline: true
        },
        { name: 'Current Requests', value: `🔴 Need: ${tracking.need_count} | 💰 Greed: ${tracking.greed_count}`, inline: false }
      )
      .setColor('#4CAF50')
      .setTimestamp()
      .setFooter({ text: `Item ID: ${itemId}` });
    
    if (item.trait) {
      embed.addFields({ name: 'Trait', value: item.trait, inline: true });
    }
    
    if (item.icon) {
      embed.setThumbnail(item.icon);
    }
    
    // Update the message
    await message.edit({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Error updating item embed:`, error);
    return false;
  }
}

// Function to mark item as claimed
async function markItemAsClaimed(itemId, claimedBy, itemName = null, itemType = null) {
  try {
    // Get message info
    const trackingResult = await pool.query(
      `SELECT * FROM item_message_tracking WHERE item_id = $1`,
      [itemId]
    );
    
    if (!trackingResult.rows.length) return false;
    const tracking = trackingResult.rows[0];
    
    // If itemName and itemType are provided, use them directly
    let finalItemName = itemName || "Unknown Item";
    let finalItemType = itemType || "Unknown";
    
    // Get discord ID for pinging the winner, if available
    let winnerDiscordId = null;
    try {
      const winnerResult = await pool.query(
        `SELECT discord_id FROM users WHERE username = $1 LIMIT 1`,
        [claimedBy]
      );
      if (winnerResult.rows.length > 0) {
        winnerDiscordId = winnerResult.rows[0].discord_id;
      }
    } catch (discordIdError) {
      console.error(`[ERROR] Error getting winner's Discord ID: ${discordIdError.message}`);
    }
    
    // Only try to get item details from the database if name and type weren't provided
    if (!itemName || !itemType) {
      console.log(`[DEBUG] No item name/type provided, trying to fetch from database for item ${itemId}`);
      // Get item details - might not exist if item was deleted
      const itemResult = await pool.query(
        `SELECT gsi.*, i.name, i.type, i.icon 
         FROM guild_storage_items gsi
         JOIN items i ON gsi.item_id = i.id
         WHERE gsi.id = $1`,
        [itemId]
      );
      
      if (itemResult.rows.length) {
        finalItemName = itemResult.rows[0].name || "Unknown Item";
        finalItemType = itemResult.rows[0].type || "Unknown";
        console.log(`[DEBUG] Found item in database: ${finalItemName}, type: ${finalItemType}`);
      } else {
        console.log(`[DEBUG] Item not found in storage table, trying to get from loot requests`);
        // Try to get info from loot requests - improved query to get more reliable results
        const requestResult = await pool.query(
          `SELECT i.name, i.type 
           FROM items i
           JOIN guild_storage_items gsi ON i.id = gsi.item_id
           WHERE gsi.id = $1
           LIMIT 1`,
          [itemId]
        );
        
        if (requestResult.rows.length) {
          finalItemName = requestResult.rows[0].name;
          finalItemType = requestResult.rows[0].type;
          console.log(`[DEBUG] Found item info from related tables: ${finalItemName}, type: ${finalItemType}`);
        } else {
          console.log(`[DEBUG] Could not find item info, using default values`);
        }
      }
    } else {
      console.log(`[DEBUG] Using provided item name: ${finalItemName}, type: ${finalItemType}`);
    }
    
    // Get the message channel
    try {
      const channel = await client.channels.fetch(tracking.channel_id);
      if (!channel) {
        console.error(`[ERROR] Channel ${tracking.channel_id} not found`);
        return false;
      }
      
      // Get the message
      const message = await channel.messages.fetch(tracking.message_id);
      if (!message) {
        console.error(`[ERROR] Message ${tracking.message_id} not found`);
        return false;
      }
      
      // Create the winner mention if Discord ID is available
      const winnerMention = winnerDiscordId ? `<@${winnerDiscordId}>` : claimedBy;
      
      // Create updated embed showing claimed status
      const embed = new EmbedBuilder()
        .setTitle('Item Claimed')
        .setDescription(`This item has been granted to **${claimedBy}**`)
        .addFields(
          { name: '📦 Item', value: `**${finalItemName}**`, inline: false },
          { name: 'Type', value: finalItemType, inline: true },
          { name: 'Requests', value: `🔴 Need: ${tracking.need_count} | 💰 Greed: ${tracking.greed_count}`, inline: true },
          { name: 'Status', value: '✅ Granted', inline: true }
        )
        .setColor('#9E9E9E') // Gray color to indicate no longer available
        .setTimestamp()
        .setFooter({ text: `Item ID: ${itemId} • No longer available` });
      
      // Create disabled buttons
      const disabledNeedItemButton = new ButtonBuilder()
        .setCustomId(`need_item_${itemId}`)
        .setLabel('Need Item')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1352736996405022780')
        .setDisabled(true);
        
      const disabledNeedTraitButton = new ButtonBuilder()
        .setCustomId(`need_trait_${itemId}`)
        .setLabel('Need Trait')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✨')
        .setDisabled(true);
        
      const disabledGreedButton = new ButtonBuilder()
        .setCustomId(`greed_item_${itemId}`)
        .setLabel('Greed')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💰')
        .setDisabled(true);
      
      const disabledRow = new ActionRowBuilder().addComponents(disabledNeedItemButton, disabledNeedTraitButton, disabledGreedButton);
      
      // Update message with disabled buttons
      await message.edit({ 
        embeds: [embed],
        components: [disabledRow]
      });
      
      // Send a congratulation message with a ping
      if (winnerDiscordId) {
        await channel.send(`🎉 Congratulations ${winnerMention}! You have been awarded **${finalItemName}**!`);
      }
      
      console.log(`[INFO] Successfully marked item ${itemId} as claimed by ${claimedBy}`);
      return true;
    } catch (error) {
      console.error(`[ERROR] Discord API error: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error(`[ERROR] Error marking item as claimed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}


// Add to your scheduled postings
function setupScheduledPostings(client) {
  // Events posting
  cron.schedule('0 10 * * *', async () => {
    try {
      // Get all guild mappings
      const mappingsResult = await pool.query('SELECT * FROM discord_guild_mappings');
      
      for (const mapping of mappingsResult.rows) {
        const appGuildId = mapping.app_guild_id;
        const discordGuildId = mapping.discord_guild_id;
        
        // Get configured channel for events
        const channelConfigResult = await pool.query(
          `SELECT channel_id FROM discord_channel_config 
           WHERE guild_id = $1 AND channel_type = 'events' AND enabled = true`,
          [appGuildId]
        );
        
        if (!channelConfigResult.rows.length) continue;
        
        const channelId = channelConfigResult.rows[0].channel_id;
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) continue;
        
        // Fetch upcoming events
        const now = new Date();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 7); // Events in next 7 days
        
        const eventsResult = await pool.query(
          `SELECT e.*, 
                 (SELECT COUNT(*) FROM event_participants ep 
                  WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
                 (SELECT COUNT(*) FROM event_participants ep 
                  WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
                 (SELECT COUNT(*) FROM event_participants ep 
                  WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
          FROM events e
          WHERE e.guild_id = $1 AND e.event_time > $2 AND e.event_time < $3
          ORDER BY e.event_time ASC`,
          [appGuildId, now, cutoff]
        );
        
        if (!eventsResult.rows.length) continue;
        
        // Post upcoming events message
        const mainEmbed = new EmbedBuilder()
          .setTitle('📅 Upcoming Events')
          .setDescription('React to an event message to sign up for that event.')
          .setColor('#00cc99')
          .setTimestamp();
        
        await channel.send({ embeds: [mainEmbed] });
        
        // Post each event as a separate message with reactions
        for (const event of eventsResult.rows) {
          const eventEmbed = EmbedBuilder.createEventEmbed({
            ...event,
            participants: {
              tank_count: event.tank_count,
              healer_count: event.healer_count, 
              dps_count: event.dps_count
            }
          });
          
          // Add react instructions
          eventEmbed.setDescription(`${event.description || 'No description provided'}\n\n**React to sign up:**\n${tankEmoji} - Tank\n${healerEmoji} - Healer\n${dpsEmoji} - DPS\n❌ - Absent`);
          
          const message = await channel.send({ embeds: [eventEmbed] });
          
          // Add role reactions
          await message.react('${tankEmoji}'); // Tank
          await message.react('${healerEmoji}'); // Healer
          await message.react('${dpsEmoji}'); // DPS
          await message.react('❌'); // Absent
          
          // Set up collector for signups
          const filter = (reaction, user) => ['${tankEmoji}', '${healerEmoji}', '${dpsEmoji}', '❌'].includes(reaction.emoji.name) && !user.bot;
          const collector = message.createReactionCollector({ filter, time: 7 * 24 * 60 * 60 * 1000 });
          
          // Handle reactions
          collector.on('collect', async (reaction, user) => {
            console.log(`[INFO] Reaction collected: ${reaction.emoji.name} from user: ${user.id} (${user.tag})`);
            
            try {
              // Get user from database with more detailed logging - NOW INCLUDES BUILDS
              console.log(`[DEBUG] Looking up user with Discord ID: ${user.id}`);
              const userResult = await pool.query(
                'SELECT id, username, builds FROM users WHERE discord_id = $1',
                [user.id]
              );
              
              console.log(`[DEBUG] User lookup result: ${JSON.stringify(userResult.rows)}`);
              
              if (!userResult.rows || userResult.rows.length === 0) {
                console.log(`[INFO] User not registered: ${user.tag} with Discord ID ${user.id}`);
                
                // DM the user that they need to register
                try {
                  await user.send(`You need to register on the website first before signing up for events.`);
                } catch (dmError) {
                  console.error(`[ERROR] Could not DM user ${user.id}: ${dmError.message}`);
                }
                return;
              }
              
              const dbUser = userResult.rows[0];
              console.log(`[INFO] Found user in database: ${dbUser.username} (ID: ${dbUser.id})`);
              
              let role, action;
              
              switch(reaction.emoji.name) {
                case '${tankEmoji}':
                  role = 'TANK';
                  action = 'signup';
                  break;
                case '${healerEmoji}':
                  role = 'HEALER';
                  action = 'signup';
                  break;
                case '${dpsEmoji}':
                  role = 'DPS';
                  action = 'signup';
                  break;
                case '❌':
                  action = 'absent';
                  break;
              }
              
              if (action === 'signup') {
                // Check if already signed up
                const existingSignupResult = await pool.query(
                  'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2',
                  [eventId, dbUser.id]
                );
                
                if (existingSignupResult.rows && existingSignupResult.rows.length) {
                  // Update role
                  console.log(`[INFO] Updating existing role to ${role} for user ${dbUser.username}`);
                  
                  await pool.query(
                    'UPDATE event_participants SET role = $1, updated_at = NOW() WHERE event_id = $2 AND user_id = $3',
                    [role, eventId, dbUser.id]
                  );
                  
                  try {
                    await user.send(`You've updated your role for "${event.title}" to ${role}.`);
                  } catch (dmError) {}
                } else {
                  // Check if role is full
                  const roleLimits = {
                    'TANK': event.tanks || 0,
                    'HEALER': event.healers || 0,
                    'DPS': event.dps || 0
                  };
                  
                  const roleCountsResult = await pool.query(
                    `SELECT 
                      COUNT(*) FILTER (WHERE role = 'TANK') as tank_count,
                      COUNT(*) FILTER (WHERE role = 'HEALER') as healer_count,
                      COUNT(*) FILTER (WHERE role = 'DPS') as dps_count
                    FROM event_participants
                    WHERE event_id = $1`,
                    [eventId]
                  );
                  
                  const roleCounts = roleCountsResult.rows[0] || {};
                  const currentCounts = {
                    'TANK': parseInt(roleCounts.tank_count || 0),
                    'HEALER': parseInt(roleCounts.healer_count || 0),
                    'DPS': parseInt(roleCounts.dps_count || 0)
                  };
                  
                  if (currentCounts[role] >= roleLimits[role]) {
                    try {
                      await user.send(`Sorry, the ${role} spots are full for "${event.title}".`);
                    } catch (dmError) {}
                    return;
                  }
                  
                  // Create new signup with thorough error handling
                  try {
                    console.log(`[INFO] Creating new signup for ${dbUser.username} as ${role}`);
                    
                    // Use a more reliable insert method with explicit values
                    await pool.query(
                      `INSERT INTO event_participants
                       (id, guild_id, event_id, user_id, role, created_at, updated_at)
                       VALUES
                       (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
                      [guildId, eventId, dbUser.id, role]
                    );
                    
                    console.log(`[INFO] Successfully signed up ${dbUser.username} as ${role}`);
                    
                    try {
                      await user.send(`You've been signed up for "${event.title}" as ${role}.`);
                    } catch (dmError) {}
                  } catch (insertError) {
                    console.error(`[ERROR] Failed to create signup: ${insertError.message}`);
                    console.error(insertError.stack);
                    
                    // Try alternative insert approach with fewer fields
                    try {
                      await pool.query(
                        `INSERT INTO event_participants
                         (guild_id, event_id, user_id, role)
                         VALUES ($1, $2, $3, $4)`,
                        [guildId, eventId, dbUser.id, role]
                      );
                      console.log(`[INFO] Alternative signup method succeeded`);
                    } catch (altError) {
                      console.error(`[ERROR] Alternative signup also failed: ${altError.message}`);
                    }
                  }
                }
              } else if (action === 'absent') {
                // Delete any existing signup
                await pool.query(
                  'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
                  [eventId, dbUser.id]
                );
                
                // Add to absentees
                try {
                  // Make sure table exists
                  await pool.query(`
                    CREATE TABLE IF NOT EXISTS event_absentees (
                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                      guild_id UUID NOT NULL,
                      event_id UUID NOT NULL,
                      user_id UUID NOT NULL,
                      created_at TIMESTAMP DEFAULT NOW(),
                      updated_at TIMESTAMP DEFAULT NOW(),
                      UNIQUE(event_id, user_id)
                    )
                  `);
                  
                  await pool.query(
                    `INSERT INTO event_absentees
                     (id, guild_id, event_id, user_id, created_at, updated_at)
                     VALUES
                     (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                     ON CONFLICT (event_id, user_id) DO NOTHING`,
                    [guildId, eventId, dbUser.id]
                  );
                  
                  try {
                    await user.send(`You've been marked as absent for "${event.title}".`);
                  } catch (dmError) {}
                } catch (insertError) {
                  console.error('Error marking as absent:', insertError);
                }
              }
              
              // Update the embed with new counts
              const updatedEventResult = await pool.query(
                `SELECT e.*, 
                       (SELECT COUNT(*) FROM event_participants ep 
                        WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
                       (SELECT COUNT(*) FROM event_participants ep 
                        WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
                       (SELECT COUNT(*) FROM event_participants ep 
                        WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
                FROM events e
                WHERE e.id = $1`,
                [eventId]
              );
              
              if (updatedEventResult.rows.length) {
                const updatedEvent = updatedEventResult.rows[0];
                const updatedEmbed = EmbedBuilder.createEventEmbed({
                  ...updatedEvent,
                  participants: {
                    tank_count: updatedEvent.tank_count,
                    healer_count: updatedEvent.healer_count,
                    dps_count: updatedEvent.dps_count
                  }
                });
                
                updatedEmbed.setDescription(`${updatedEvent.description || 'No description provided'}\n\n**React to sign up:**\n${tankEmoji} - Tank\n${healerEmoji} - Healer\n${dpsEmoji} - DPS\n❌ - Absent`);
                updatedEmbed.setFooter({ text: `React with emojis below to sign up • Event ID: ${eventId}` });
                
                await message.edit({ embeds: [updatedEmbed] });
              }
            } catch (error) {
              console.error(`[ERROR] Error processing reaction: ${error.message}`);
              console.error(error.stack);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in scheduled events posting:', error);
    }
  });
}

const API_URL = process.env.BACKEND_URL || 'https://tevent.app';

// Collection to store commands
client.commands = new Collection();

// Set up a small express server to receive webhook updates
const app = express();
const PORT = process.env.BOT_PORT || 3300;

app.use(bodyParser.json());

// Endpoint to update mappings from the main backend
app.post('/update-mapping', (req, res) => {
  const { discordGuildId, appGuildId, secret } = req.body;
  
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  console.log(`Received mapping update: Discord Guild ${discordGuildId} -> App Guild ${appGuildId}`);
  
  // You can store in memory for quick access if needed
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Bot webhook server running on port ${PORT}`);
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();

  setupScheduledPostings(client);
});

app.post('/webhook/new-item', async (req, res) => {
  try {
    const { guildId, itemId, secret } = req.body;
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Fetch the item
    const itemResult = await pool.query(
      `SELECT gsi.*, i.name, i.type, i.icon 
       FROM guild_storage_items gsi
       LEFT JOIN items i ON gsi.item_id = i.id
       WHERE gsi.id = $1`,
      [itemId]
    );
    
    if (!itemResult.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    
    // Get Discord guild ID
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get channel ID
    const channelConfigResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = 'storage' AND enabled = true`,
      [guildId]
    );
    
    let channelId;
    if (channelConfigResult.rows.length) {
      channelId = channelConfigResult.rows[0].channel_id;
    } else {
      // Try to get a default channel
      const guild = await client.guilds.fetch(discordGuildId);
      if (!guild || !guild.systemChannel) {
        return res.status(404).json({ error: 'No suitable channel found' });
      }
      channelId = guild.systemChannel.id;
    }
    
    // Get the channel
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Format time remaining for display if available
    let timeRemaining = "Default (24h)";
    if (item.timer_duration && item.created_at) {
      try {
        timeRemaining = calculateTimeRemaining(item.created_at, item.timer_duration) || 
                       formatTimerDuration(item.timer_duration || 1440);
      } catch (timeError) {
        console.error("Error calculating time remaining:", timeError);
        timeRemaining = formatTimerDuration(item.timer_duration || 1440);
      }
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('New Item Added to Storage')
      .setDescription(`Request this item using the buttons below:`)
      .addFields(
        { name: '📦 Item', value: `**${item.name}**`, inline: false },
        { name: 'Type', value: item.type || 'Unknown', inline: true },
        { name: 'Quantity', value: item.quantity.toString() || '0', inline: true },
        { name: 'DKP Cost', value: (item.dkp_cost || 0).toString(), inline: true },
        { 
          name: '⏰ Roll Timer', 
          value: timeRemaining,
          inline: true 
        }
      )
      .setColor('#4CAF50')
      .setTimestamp()
      .setFooter({ text: `Item ID: ${itemId}` });
    
    if (item.trait) {
      embed.addFields({ name: 'Trait', value: item.trait, inline: true });
    }
    
    if (item.icon) {
      embed.setThumbnail(item.icon);
    }
    
    // Create buttons - ENSURE CONSISTENT NAME
    const buttonsRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`need_item_${item.id}`)
          .setLabel('Need Item')
          .setEmoji('1352736996405022780')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`need_trait_${item.id}`)
          .setLabel('Need Trait')
          .setEmoji('✨')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`greed_item_${item.id}`)
          .setLabel('Greed')
          .setEmoji('💰')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Send the message with buttons - USE THE SAME VARIABLE NAME
    const message = await channel.send({
      embeds: [embed],
      components: [buttonsRow]  // Use buttonsRow consistently
    });
    
    // Create tracking table if needed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_message_tracking (
        id SERIAL PRIMARY KEY,
        item_id UUID NOT NULL,
        guild_id UUID NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        need_count INTEGER DEFAULT 0,
        greed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(item_id)
      )
    `);
    
    // Store message info
    await pool.query(
      `INSERT INTO item_message_tracking 
       (item_id, guild_id, channel_id, message_id, need_count, greed_count)
       VALUES ($1, $2, $3, $4, 0, 0)
       ON CONFLICT (item_id) DO UPDATE SET
       channel_id = $3, message_id = $4, updated_at = NOW()`,
      [item.id, guildId, channelId, message.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing new item webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/webhook/new-event', async (req, res) => {
  try {
    const { guildId, eventId, secret } = req.body;
    
    console.log(`[INFO] Received new event webhook - Guild: ${guildId}, Event: ${eventId}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get Discord guild ID
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.error(`[ERROR] Discord guild mapping not found for guild: ${guildId}`);
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get the channel configuration
    const channelConfigResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = 'events' AND enabled = true`,
      [guildId]
    );
    
    if (!channelConfigResult.rows.length) {
      console.error(`[ERROR] No events channel configured for guild: ${guildId}`);
      return res.status(404).json({ error: 'No events channel configured' });
    }
    
    const channelId = channelConfigResult.rows[0].channel_id;
    
    // Fetch the newly created event
    const eventResult = await pool.query(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
    
    if (!eventResult.rows.length) {
      console.error(`[ERROR] Event not found: ${eventId}`);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventResult.rows[0];
    
    // Get current participants - NOW INCLUDES BUILDS
    const participantsResult = await pool.query(
      `SELECT ep.role, u.username, u.discord_id, u.builds
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = $1
       ORDER BY ep.created_at ASC`,
      [eventId]
    );
    
    // Get absences
    const absenteesResult = await pool.query(
      `SELECT ea.user_id, u.username
       FROM event_absentees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1
       ORDER BY ea.created_at ASC`,
      [eventId]
    );
    
    const tanks = participantsResult.rows.filter(p => p.role === 'TANK');
    const healers = participantsResult.rows.filter(p => p.role === 'HEALER');
    const dps = participantsResult.rows.filter(p => p.role === 'DPS');
    const absentees = absenteesResult.rows;
    
    const formatDate = (date) => {
      if (!date) return "Date not set";
      date = new Date(date);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const tankEmoji = '<:Tank:1352736996405022780>';
    const healerEmoji = '<:Healer:1352737011479482468>';
    const dpsEmoji = '<:DPS:1352737043972624518>';
    
    const formatTime = (date) => {
      if (!date) return "Time not set";
      date = new Date(date);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    
    // Create a simple embed object directly
    const embed = {
      title: eventData.title || 'Event',
      color: 0x0099ff,
      fields: [
        {
          name: '⏰ Time',
          value: `📅 ${formatDate(eventData.event_time)} ⌚ ${formatTime(eventData.event_time)}`,
          inline: false
        },
        {
          name: '📍 Location',
          value: eventData.location || 'Not specified',
          inline: false
        },
        {
          name: `${tankEmoji} Tanks (${tanks.length}/${eventData.tanks || 0})`,
          value: tanks.length > 0 ? 
            tanks.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
            '—',
          inline: true
        },
        {
          name: `${healerEmoji} Healers (${healers.length}/${eventData.healers || 0})`,
          value: healers.length > 0 ? 
            healers.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
            '—',
          inline: true
        },
        {
          name: `${dpsEmoji} DPS (${dps.length}/${eventData.dps || 0})`,
          value: dps.length > 0 ? 
            dps.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
            '—',
          inline: true
        },
        {
          name: `❌ Absent (${absentees.length})`,
          value: absentees.length > 0 ? 
            absentees.map((a, i) => `${i+1}. ${a.username}`).join('\n') : 
            '—',
          inline: true
        },
        {
          name: '⏳ Tentative (0)',
          value: '—',
          inline: true
        }
      ],
      footer: {
        text: `Event ID: ${eventId}`
      }
    };
    
    try {
      const channel = await client.channels.fetch(channelId);
      
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      // Create signup buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_TANK`)
            .setLabel('Tank')
            .setEmoji('1352736996405022780')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_HEALER`)
            .setLabel('Healer')
            .setEmoji('1352737011479482468')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_DPS`)
            .setLabel('DPS')
            .setEmoji('1352737043972624518')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_ABSENT`)
            .setLabel('Absent')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
        );
      
      const message = await channel.send({
        content: `**${eventData.title || 'New Event'}**`,
        embeds: [embed],
        components: [row]
      });

      try {
        await pool.query(
          `INSERT INTO discord_event_messages 
           (guild_id, event_id, channel_id, message_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (event_id) 
           DO UPDATE SET 
             channel_id = $3,
             message_id = $4`,
          [guildId, eventId, channelId, message.id]
        );
      } catch (storeError) {
        console.error(`[ERROR] Failed to store Discord message ID: ${storeError.message}`);
      }
      
    } catch (channelError) {
      console.error(`[ERROR] Error sending to channel:`, channelError);
      return res.status(500).json({ error: 'Error sending to channel' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[ERROR] Error processing new event webhook:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/webhook/delete-event', async (req, res) => {
  try {
    const { guildId, eventId, secret } = req.body;
    
    console.log(`[INFO] Received delete event webhook - Guild: ${guildId}, Event: ${eventId}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get the message information
    const messageResult = await pool.query(
      `SELECT channel_id, message_id FROM discord_event_messages WHERE event_id = $1`,
      [eventId]
    );
    
    if (!messageResult.rows.length) {
      console.log(`[INFO] No Discord message found for event ${eventId}`);
      return res.json({ success: true, message: 'No Discord message found' });
    }
    
    const { channel_id, message_id } = messageResult.rows[0];
    console.log(`[INFO] Found Discord message ${message_id} in channel ${channel_id}`);
    
    try {
      // Get the channel
      const channel = await client.channels.fetch(channel_id);
      
      if (!channel) {
        console.error(`[ERROR] Channel not found: ${channel_id}`);
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      // Get the message
      const message = await channel.messages.fetch(message_id);
      
      if (!message) {
        console.error(`[ERROR] Message not found: ${message_id}`);
        return res.status(404).json({ error: 'Message not found' });
      }
      
      // Delete the message
      await message.delete();
      console.log(`[INFO] Successfully deleted Discord message for event ${eventId}`);
    } catch (discordError) {
      console.error(`[ERROR] Error deleting Discord message:`, discordError);
      // Continue even if Discord delete fails
    }
    
    // Remove the message from the database
    await pool.query(
      `DELETE FROM discord_event_messages WHERE event_id = $1`,
      [eventId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[ERROR] Error processing delete event webhook:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle when the bot joins a new server
client.on('guildCreate', async (guild) => {
  try {
    // Find the best channel to send welcome message
    const targetChannel = guild.systemChannel || 
                         guild.channels.cache.find(c => 
                           c.type === 0 && // TextChannel type
                           guild.members.me.permissionsIn(c).has('SendMessages')
                         );
    
    if (!targetChannel) return;
    
    // Get guild owner
    const owner = await guild.fetchOwner();
    
    // Create setup message with components
    const embed = new EmbedBuilder()
      .setTitle('Bot Setup')
      .setDescription(`Thanks for adding me to ${guild.name}! Let's link this server to your application guild.`)
      .addFields([
        { 
          name: 'Option 1: Quick Setup', 
          value: 'Use the button below to open a setup page where you can select your application guild.' 
        },
        { 
          name: 'Option 2: Manual Setup', 
          value: 'If you already know your guild ID and join code, use the `/link-guild` command.' 
        }
      ])
      .setColor('#4CAF50');
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_wizard')
          .setLabel('Setup Wizard')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setURL(`${process.env.FRONTEND_URL}/discord/setup?guildId=${guild.id}`)
          .setLabel('Quick Setup')
          .setStyle(ButtonStyle.Link)
      );
    
    await targetChannel.send({ 
      content: `<@${owner.id}>, please set up the bot to enable all features.`,
      embeds: [embed], 
      components: [row] 
    });
    
    // Also send a DM to the server owner
    try {
      await owner.send({ 
        content: `Hi! I was just added to your server **${guild.name}**. Please set up the bot to enable all features.`,
        embeds: [embed], 
        components: [row] 
      });
    } catch (dmError) {
      console.log('Could not send DM to owner, continuing anyway');
    }
  } catch (error) {
    console.error('Error in guildCreate handler:', error);
  }
});


// Member join handler
client.on('guildMemberAdd', async (member) => {
  try {
    // Get app guild ID from database
    const appGuildId = await getGuildMapping(member.guild.id);
    if (!appGuildId) {
      console.log(`[INFO] No guild mapping found for Discord server ${member.guild.id}. Skipping user registration.`);
      return; // Skip if no mapping exists
    }
    
    // Log attempt to register user
    console.log(`[INFO] Attempting to register user ${member.user.username} (${member.id}) to guild ${appGuildId}`);
    
    // Check if API_URL is configured properly
    if (!API_URL || API_URL === 'https://tevent.app') {
      console.log(`[WARN] API_URL not properly configured or backend unavailable. Cannot register user automatically.`);
      return;
    }
    
    // Try direct database registration first instead of API
    try {
      // Check if user already exists
      const existingResult = await pool.query(
        'SELECT id FROM users WHERE discord_id = $1',
        [member.id]
      );
      
      if (existingResult.rows && existingResult.rows.length > 0) {
        console.log(`[INFO] User ${member.user.username} already exists in database.`);
        
        // Check if user is in the guild
        const memberResult = await pool.query(
          'SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2',
          [appGuildId, existingResult.rows[0].id]
        );
        
        if (!memberResult.rows || memberResult.rows.length === 0) {
          // Add user to guild
          await pool.query(
            `INSERT INTO guild_members
             (id, guild_id, user_id, role, created_at, updated_at)
             VALUES
             (gen_random_uuid(), $1, $2, 'Guild Member', NOW(), NOW())`,
            [appGuildId, existingResult.rows[0].id]
          );
          
          console.log(`[INFO] Added existing user ${member.user.username} to guild ${appGuildId}`);
        } else {
          console.log(`[INFO] User ${member.user.username} already in guild ${appGuildId}`);
        }
        
        return;
      }
      
      // Register new user directly in database
      const userResult = await pool.query(
        `INSERT INTO users
         (id, username, discord_id, created_at, updated_at)
         VALUES
         (gen_random_uuid(), $1, $2, NOW(), NOW())
         RETURNING id`,
        [member.user.username, member.id]
      );
      
      if (userResult.rows && userResult.rows.length > 0) {
        // Add user to guild
        await pool.query(
          `INSERT INTO guild_members
           (id, guild_id, user_id, role, created_at, updated_at)
           VALUES
           (gen_random_uuid(), $1, $2, 'Guild Member', NOW(), NOW())`,
          [appGuildId, userResult.rows[0].id]
        );
        
        console.log(`[INFO] Successfully registered user ${member.user.username} to guild ${appGuildId}`);
      }
      
      return;
    } catch (dbError) {
      console.error(`[ERROR] Database registration failed: ${dbError.message}`);
      // Fall back to API method if database direct access fails
    }
    
    // API fallback method (only attempt if above fails)
    try {
      // First try token-based authentication
      let authHeader = null;
      
      try {
        const tokenResponse = await axios.post(`${API_URL}/auth/bot-token`, {
          botSecret: process.env.DISCORD_CLIENT_SECRET
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        if (tokenResponse.data && tokenResponse.data.token) {
          console.log('[INFO] Token authentication successful');
          authHeader = { 'Authorization': `Bearer ${tokenResponse.data.token}` };
        }
      } catch (tokenError) {
        console.log(`[WARN] Token auth failed, trying session auth: ${tokenError.message}`);
      }
      
      // If token auth failed, try session-based auth
      if (!authHeader) {
        try {
          const loginResponse = await axios.post(`${API_URL}/auth/bot-login`, {
            botSecret: process.env.DISCORD_CLIENT_SECRET
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          });
          
          if (loginResponse.headers['set-cookie']) {
            console.log('[INFO] Session authentication successful');
            authHeader = { Cookie: loginResponse.headers['set-cookie'] };
          } else {
            throw new Error('No session cookie received');
          }
        } catch (loginError) {
          console.error(`[ERROR] Authentication failed: ${loginError.message}`);
          return; // Exit if we can't authenticate
        }
      }
      
      // Now add the user with authentication
      try {
        await axios.post(`${API_URL}/api/users`, {
          discordId: member.id,
          username: member.user.username,
          role: 'Guild Member',
          guildId: appGuildId
        }, {
          headers: {
            ...(authHeader || {}),
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        console.log(`[INFO] User ${member.user.username} added to guild ${appGuildId} via API!`);
      } catch (userError) {
        // Check specific error - if user already exists, this is expected
        if (userError.response && userError.response.status === 409) {
          console.log(`[INFO] User ${member.user.username} already exists in the system.`);
        } else {
          console.error(`[ERROR] Failed to add user: ${userError.message}`);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Error adding new user: ${error.message}`);
      // Do not crash, just log the error and continue
    }
  } catch (error) {
    console.error('Error adding new user:', error);
    // Just log the error, do not crash the bot
  }
});

async function processLootApproval(requestId, discordGuildId, channelId, client) {
  try {
    // Get app guild ID
    const mappingResult = await pool.query(
      'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
      [discordGuildId]
    );
    
    if (!mappingResult.rows.length) {
      return { 
        success: false, 
        message: 'This Discord server is not linked to an application guild.' 
      };
    }
    
    const appGuildId = mappingResult.rows[0].app_guild_id;
    
    // Get request details
    const requestResult = await pool.query(
      `SELECT lr.*, 
            gsi.quantity, 
            i.name as item_name,
            i.type as item_type,
            u.username, u.discord_id,
            gsi.id as storage_item_id
      FROM loot_requests lr
      JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
      JOIN items i ON gsi.item_id = i.id
      JOIN users u ON lr.user_id = u.id
      WHERE lr.id = $1 AND lr.guild_id = $2`,
      [requestId, appGuildId]
    );
    
    if (!requestResult.rows.length) {
      return { 
        success: false, 
        message: 'Request not found or already processed.' 
      };
    }
    
    const request = requestResult.rows[0];
    const storageItemId = request.storage_item_id;
    const itemName = request.item_name;
    const itemType = request.item_type || 'Unknown';
    const willReachZero = request.quantity <= 1;
    
    // Process with a transaction
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      
      // 1. First update the current request to approved
      await dbClient.query(
        `UPDATE loot_requests 
         SET status = 'Approved', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      
      if (willReachZero) {
        console.log(`[INFO] Item ${storageItemId} quantity will reach zero - removing from storage`);
        
        // 2. Update other pending requests to a different status
        await dbClient.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Out of Stock', updated_at = NOW()
           WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
          [storageItemId, requestId]
        );
        
        // 3. Delete all loot requests for this item first to handle foreign key constraints
        await dbClient.query(
          `DELETE FROM loot_requests 
           WHERE storage_item_id = $1`,
          [storageItemId]
        );
        
        // 4. Now we can safely delete the item
        await dbClient.query(
          `DELETE FROM guild_storage_items WHERE id = $1`,
          [storageItemId]
        );
      } else {
        // Just decrement quantity
        await dbClient.query(
          `UPDATE guild_storage_items
           SET quantity = quantity - 1, updated_at = NOW()
           WHERE id = $1`,
          [storageItemId]
        );
        
        // Update other pending requests
        await dbClient.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Granted to other', updated_at = NOW()
           WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
          [storageItemId, requestId]
        );
      }
      
      await dbClient.query('COMMIT');
      console.log(`[INFO] Transaction committed successfully for request ${requestId}`);
      
      // Send notification to the user (outside the transaction)
      if (request.discord_id) {
        try {
          const user = await client.users.fetch(request.discord_id);
          await user.send(`✅ Your request for **${itemName}** has been approved!`).catch(() => {});
        } catch (dmError) {
          console.error(`Failed to DM user: ${dmError.message}`);
        }
      }
      
      // Update UI elements with the stored item name and type
      try {
        await markItemAsClaimed(storageItemId, request.username, itemName, itemType);
      } catch (uiError) {
        console.error(`Error marking item as claimed: ${uiError.message}`);
      }
      
      const responseMessage = willReachZero
        ? `✅ Request approved. **${itemName}** will be given to **${request.username}**. This was the last available item.`
        : `✅ Request approved. **${itemName}** will be given to **${request.username}**.`;
      
      return { 
        success: true, 
        message: responseMessage,
        publicMessage: responseMessage,
        wasLastItem: willReachZero 
      };
    } catch (error) {
      await dbClient.query('ROLLBACK');
      console.error(`Transaction error: ${error.message}`);
      throw error;
    } finally {
      dbClient.release();
    }
  } catch (error) {
    console.error(`Error processing loot approval: ${error}`);
    throw error;
  }
}

async function getItemType(dbClient, storageItemId) {
  try {
    const typeResult = await dbClient.query(
      `SELECT i.type FROM guild_storage_items gsi
       JOIN items i ON gsi.item_id = i.id
       WHERE gsi.id = $1`,
      [storageItemId]
    );
    
    return typeResult.rows.length ? typeResult.rows[0].type : 'Unknown';
  } catch (error) {
    console.error(`Error getting item type: ${error.message}`);
    return 'Unknown';
  }
}

// Button interaction handler
// Slash command and interaction handler
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isCommand()) {
      const { commandName, options } = interaction;
      
      // Handle link-guild command (special case)
      if (commandName === 'link-guild') {
        await handleLinkGuildCommand(interaction);
        return;
      }
      
      // Handle help command (no guild required)
      if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('Tevent Guild Management Bot')
          .setColor('#90caf9')
          .setDescription('Manage your Tevent guild directly from Discord')
          .addFields([
            { name: '/setup', value: 'Link this Discord server to your Tevent guild (Admin only)' },
            { name: '/storage', value: 'Display items in the guild storage' },
            { name: '/events', value: 'View upcoming events' },
            { name: '/event-signup', value: 'Sign up for an event' },
            { name: '/teams', value: 'View teams for an event' },
            { name: '/members', value: 'View guild members' },
            { name: '/help', value: 'Show this help message' }
          ])
          .setFooter({ text: 'Tevent.app - Guild Management Made Easy' });
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      // For all other commands, check if this Discord server is linked
      const discordGuildId = interaction.guild?.id;
      
      if (!discordGuildId) {
        return await interaction.reply({ 
          content: 'This command must be used in a Discord server.',
          ephemeral: true 
        });
      }
      
      // Get linked guild ID from database
      const appGuildId = await getGuildMapping(discordGuildId);
      
      if (!appGuildId) {
        return await interaction.reply({ 
          content: 'This Discord server is not linked to an application guild. An admin needs to use the `/setup` command first.',
          ephemeral: true 
        });
      }
      
      // Handle commands with direct DB access
      if (commandName === 'storage') {
        await handleStorageCommand(interaction, appGuildId);
      }
      else if (commandName === 'events') {
        await handleEventsCommand(interaction, appGuildId);
      }
      else if (commandName === 'event-signup') {
        await handleEventSignupCommand(interaction, appGuildId);
      }
      else if (commandName === 'teams') {
        await handleTeamsCommand(interaction, appGuildId);
      }
      else if (commandName === 'members') {
        await handleMembersCommand(interaction, appGuildId);
      }
      else if (commandName === 'config-channel') {
        await handleConfigChannelCommand(interaction, appGuildId);
      }
      else if (commandName === 'check-connection') {
        await handleCheckConnectionCommand(interaction, appGuildId);
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      const customId = interaction.customId;
      
      if (customId.startsWith('signup_')) {
        try {
          // Log the interaction being processed
          console.log(`[INFO] Processing signup button: ${customId}`);
          
          // Immediately defer the reply to prevent timeout
          await interaction.deferReply({ ephemeral: true }).catch(error => {
            if (error.code === 10062) {
              console.log(`[WARN] Interaction ${interaction.id} already acknowledged, continuing processing`);
              return; // Continue execution even if the interaction was already acknowledged
            }
            throw error; // Rethrow any other errors
          });
          
          // Parse event ID and role from the button's custom ID
          const [_, eventId, role] = customId.split('_');
          console.log(`[DEBUG] Processing signup for event: ${eventId}, role: ${role}`);
          
          // Check guild mapping
          const discordGuildId = interaction.guild?.id;
          if (!discordGuildId) {
            await safeReply(interaction, {
              content: 'This button must be used in a Discord server.',
              ephemeral: true
            });
            return;
          }
          
          // Get app guild ID from mapping
          const appGuildId = await getGuildMapping(discordGuildId);
          if (!appGuildId) {
            await safeReply(interaction, {
              content: 'This Discord server is not linked to an application guild.',
              ephemeral: true
            });
            return;
          }
    
          // Get user from discord ID
          const userResult = await pool.query(
            'SELECT id, username, builds FROM users WHERE discord_id = $1',
            [interaction.user.id]
          );
          
          if (!userResult.rows || userResult.rows.length === 0) {
            await safeReply(interaction, {
              content: 'You need to register on the website first before signing up for events.',
              ephemeral: true
            });
            return;
          }
          
          const userId = userResult.rows[0].id;
          
          // Get event details
          const eventResult = await pool.query(
            'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
            [eventId, appGuildId]
          );
          
          if (!eventResult.rows || eventResult.rows.length === 0) {
            await safeReply(interaction, {
              content: 'Event not found.',
              ephemeral: true
            });
            return;
          }
          
          const eventDetails = eventResult.rows[0];
          
          // Handle different role types
          if (role === 'ABSENT') {
            // Remove from participants
            await pool.query(
              'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, userId]
            );
            
            // Add to absentees
            await pool.query(
              `INSERT INTO event_absentees 
                (id, guild_id, event_id, user_id, created_at, updated_at)
              VALUES 
                (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
              ON CONFLICT (event_id, user_id) DO NOTHING`,
              [appGuildId, eventId, userId]
            );
            
            await safeReply(interaction, {
              content: `You have been marked as absent for "${eventDetails.title}".`,
              ephemeral: true
            });
          } else if (role === 'TENTATIVE') {
            // Handle tentative signup
            try {
              // Check if we have a tentative table, if not create one
              await pool.query(`
                CREATE TABLE IF NOT EXISTS event_tentative (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  guild_id UUID NOT NULL,
                  event_id UUID NOT NULL, 
                  user_id UUID NOT NULL,
                  created_at TIMESTAMP DEFAULT NOW(),
                  updated_at TIMESTAMP DEFAULT NOW(),
                  UNIQUE(event_id, user_id)
                )
              `);
              
              // Remove from participants and absentees
              await pool.query(
                'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
              
              await pool.query(
                'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
              
              // Add to tentative
              await pool.query(
                `INSERT INTO event_tentative 
                  (id, guild_id, event_id, user_id, created_at, updated_at)
                VALUES
                  (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                ON CONFLICT (event_id, user_id) DO UPDATE SET
                  updated_at = NOW()`,
                [appGuildId, eventId, userId]
              );
              
              await safeReply(interaction, {
                content: `You have been marked as tentative for "${eventDetails.title}".`,
                ephemeral: true
              });
            } catch (tentativeError) {
              console.error('Error handling tentative signup:', tentativeError);
              await safeReply(interaction, {
                content: `An error occurred while marking you as tentative.`,
                ephemeral: true
              });
            }
          } else {
            // Regular role signup
            
            // Check if already signed up
            const existingSignup = await pool.query(
              'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, userId]
            );
            
            if (existingSignup.rows && existingSignup.rows.length > 0) {
              // Update existing signup
              await pool.query(
                'UPDATE event_participants SET role = $1 WHERE id = $2',
                [role, existingSignup.rows[0].id]
              );
              
              await safeReply(interaction, {
                content: `Your role for "${eventDetails.title}" has been updated to ${role}.`,
                ephemeral: true
              });
            } else {
              // Check role capacity
              const roleCountsResult = await pool.query(
                `SELECT 
                  COUNT(*) FILTER (WHERE role = 'TANK') as tank_count,
                  COUNT(*) FILTER (WHERE role = 'HEALER') as healer_count,
                  COUNT(*) FILTER (WHERE role = 'DPS') as dps_count
                FROM event_participants
                WHERE event_id = $1`,
                [eventId]
              );
              
              const roleCounts = roleCountsResult.rows[0];
              
              // Verify there's room for this role
              const roleLimits = {
                'TANK': eventDetails.tanks || 0,
                'HEALER': eventDetails.healers || 0,
                'DPS': eventDetails.dps || 0
              };
              
              const currentCounts = {
                'TANK': parseInt(roleCounts?.tank_count || 0),
                'HEALER': parseInt(roleCounts?.healer_count || 0),
                'DPS': parseInt(roleCounts?.dps_count || 0)
              };
              
              if (currentCounts[role] >= roleLimits[role]) {
                await safeReply(interaction, {
                  content: `Sorry, the ${role} spots are full for this event.`,
                  ephemeral: true
                });
                return;
              }
              
              // Remove from absentees if marked before
              await pool.query(
                'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
              
              // Remove from tentative if marked before
              try {
                await pool.query(
                  'DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2',
                  [eventId, userId]
                );
              } catch (e) {
                // Table might not exist, ignore
              }
              
              // Create new signup
              await pool.query(
                `INSERT INTO event_participants 
                  (id, guild_id, event_id, user_id, role, created_at, updated_at)
                VALUES
                  (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
                [appGuildId, eventId, userId, role]
              );
              
              await safeReply(interaction, {
                content: `You have been signed up for "${eventDetails.title}" as ${role}.`,
                ephemeral: true
              });
            }
          }
          
          // Update the message with new counts - careful error handling
          try {
            // Get the original message that contains the embed
            const message = interaction.message;
            if (message && message.embeds && message.embeds.length > 0) {
              // Get updated event data for refreshing the embed
              try {
                // Get all participants with their builds
                const participantsResult = await pool.query(
                  `SELECT ep.role, u.username, u.discord_id, u.builds
                   FROM event_participants ep
                   JOIN users u ON ep.user_id = u.id
                   WHERE ep.event_id = $1
                   ORDER BY ep.created_at ASC`,
                  [eventId]
                );
                
                // Get absentees
                const absenteesResult = await pool.query(
                  `SELECT ea.user_id, u.username
                   FROM event_absentees ea
                   JOIN users u ON ea.user_id = u.id
                   WHERE ea.event_id = $1
                   ORDER BY ea.created_at ASC`,
                  [eventId]
                );
                
                // Get tentative members if the table exists
                let tentativeMembers = [];
                try {
                  const tentativeResult = await pool.query(
                    `SELECT et.user_id, u.username
                     FROM event_tentative et
                     JOIN users u ON et.user_id = u.id
                     WHERE et.event_id = $1
                     ORDER BY et.created_at ASC`,
                    [eventId]
                  );
                  
                  tentativeMembers = tentativeResult.rows || [];
                } catch (e) {
                  // Table might not exist, ignore
                }
                
                // Create updated event object
                const updatedEvent = {
                  ...eventDetails,
                  participants: participantsResult.rows,
                  absentees: absenteesResult.rows,
                  tentative: tentativeMembers
                };
                
                // Create updated embed
                const updatedEmbed = embedBuilder.createEventEmbed(updatedEvent);
                
                // Create signup buttons with custom role emojis
                const row = new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId(`signup_${eventId}_TANK`)
                      .setLabel('Tank')
                      .setEmoji('1352736996405022780')
                      .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                      .setCustomId(`signup_${eventId}_HEALER`)
                      .setLabel('Healer')
                      .setEmoji('1352737011479482468')
                      .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                      .setCustomId(`signup_${eventId}_DPS`)
                      .setLabel('DPS')
                      .setEmoji('1352737043972624518')
                      .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                      .setCustomId(`signup_${eventId}_TENTATIVE`)
                      .setLabel('Tentative')
                      .setEmoji('⏳')
                      .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                      .setCustomId(`signup_${eventId}_ABSENT`)
                      .setLabel('Absent')
                      .setEmoji('❌')
                      .setStyle(ButtonStyle.Secondary)
                  );
                
                // Update the original message with new embed
                await message.edit({
                  embeds: [updatedEmbed],
                  components: [row]
                }).catch(err => {
                  console.error(`[ERROR] Failed to update message with new embed: ${err.message}`);
                });
                
                console.log(`[INFO] Successfully updated event embed for event ${eventId}`);
              } catch (updateError) {
                console.error(`[ERROR] Error preparing updated embed: ${updateError.message}`);
              }
            }
          } catch (messageError) {
            console.error(`[ERROR] Error updating event message: ${messageError.message}`);
            // Don't rethrow - we've already handled the primary interaction
          }
        } catch (error) {
          console.error(`Error processing signup button:`, error);
          
          // Try to salvage the interaction if possible
          try {
            await safeReply(interaction, {
              content: 'An error occurred while processing your signup. Please try again.',
              ephemeral: true
            });
          } catch (replyError) {
            console.error(`Failed to send error response: ${replyError.message}`);
          }
        }
      }
      
      // Handle item request buttons (Need/Greed)
      else if (customId.startsWith('need_item_') || customId.startsWith('need_trait_') || customId.startsWith('greed_item_')) {
        const itemId = customId.replace(/^(need_item_|need_trait_|greed_item_)/, '');
        const requestType = customId.startsWith('need_item_') ? 'NEED_ITEM' : 
                            customId.startsWith('need_trait_') ? 'NEED_TRAIT' : 'GREED';
        
        // For tracking counters, we'll still use need_count for both NEED types
        const priorityField = requestType === 'GREED' ? 'greed_count' : 'need_count';
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
          // Get Discord server ID and app guild ID
          const discordGuildId = interaction.guild?.id;
          
          // Get appGuildId from database
          const mappingResult = await pool.query(
            'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
            [discordGuildId]
          );
          
          if (!mappingResult.rows.length) {
            return await interaction.editReply('This Discord server is not linked to an application guild.');
          }
          
          const appGuildId = mappingResult.rows[0].app_guild_id;
          
          // Get user by Discord ID
          const userResult = await pool.query(
            'SELECT id, username FROM users WHERE discord_id = $1',
            [interaction.user.id]
          );
          
          if (!userResult.rows.length) {
            return await interaction.editReply('You need to register on the website first before requesting items.');
          }
          
          const userId = userResult.rows[0].id;
          
          // Check if item is available
          const itemResult = await pool.query(
            `SELECT gsi.*, i.name, i.type, i.icon 
             FROM guild_storage_items gsi
             JOIN items i ON gsi.item_id = i.id
             WHERE gsi.id = $1`,
            [itemId]
          );
          
          if (!itemResult.rows.length || itemResult.rows[0].quantity < 1) {
            return await interaction.editReply('This item is no longer available.');
          }
          
          const item = itemResult.rows[0];
          
          // Check if request type is valid for this item
          if (requestType === 'NEED_TRAIT' && !item.trait) {
            return await interaction.editReply(`This item doesn't have a trait, so you can't request it as 'Need Trait'. Please use 'Need Item' instead.`);
          }
          
          // Check if user already has a pending request for this item
          const existingRequestResult = await pool.query(
            `SELECT id, need_or_greed FROM loot_requests 
             WHERE storage_item_id = $1 AND user_id = $2 AND status = 'Pending'`,
            [itemId, userId]
          );
          
          if (existingRequestResult.rows.length) {
            const existingType = existingRequestResult.rows[0].need_or_greed;
            
            if (existingType === requestType) {
              return await interaction.editReply(`You already have a ${requestType} request for "${item.name}".`);
            }
            
            // User is changing request type, update the existing request
            await pool.query(
              `UPDATE loot_requests 
               SET need_or_greed = $1, updated_at = NOW()
               WHERE id = $2`,
              [requestType, existingRequestResult.rows[0].id]
            );
            
            // Update the counter in the tracking table - handle both need types appropriately
            const dbClient = await pool.connect();
            try {
              await dbClient.query('BEGIN');
              
              // First determine the previous counter field to decrement
              const oldPriorityField = existingType === 'GREED' ? 'greed_count' : 'need_count';
              
              await dbClient.query(
                `UPDATE item_message_tracking 
                 SET ${oldPriorityField} = GREATEST(${oldPriorityField} - 1, 0),
                     ${priorityField} = ${priorityField} + 1,
                     updated_at = NOW()
                 WHERE item_id = $1`,
                [itemId]
              );
              
              await dbClient.query('COMMIT');
            } catch (error) {
              await dbClient.query('ROLLBACK');
              throw error;
            } finally {
              dbClient.release();
            }
            
            // Update the embed
            await updateItemEmbed(itemId);
            
            const requestTypeDisplay = requestType === 'NEED_ITEM' ? 'Need Item' : 
                                  requestType === 'NEED_TRAIT' ? 'Need Trait' : 'Greed';
                                  
            return await interaction.editReply(`Your request for "${item.name}" has been updated to ${requestTypeDisplay}.`);
          }
          
          // Create new loot request with need_or_greed field
          const requestResult = await pool.query(
            `INSERT INTO loot_requests
             (id, guild_id, storage_item_id, user_id, status, need_or_greed, created_at, updated_at)
             VALUES
             (gen_random_uuid(), $1, $2, $3, 'Pending', $4, NOW(), NOW())
             RETURNING id`,
            [appGuildId, itemId, userId, requestType]
          );
          
          const requestId = requestResult.rows[0].id;
          
          // Update the counter in the tracking table
          await pool.query(
            `UPDATE item_message_tracking 
             SET ${priorityField} = ${priorityField} + 1,
                 updated_at = NOW()
             WHERE item_id = $1`,
            [itemId]
          );
          
          // Update the item embed with new request count
          await updateItemEmbed(itemId);
          
          // Format timer info
          const timeRemaining = calculateTimeRemaining(item.created_at, item.timer_duration);
          
          // Send notification to loot channel with approve/deny buttons
          const requestTypeDisplay = requestType === 'NEED_ITEM' ? 'Need Item' : 
                                requestType === 'NEED_TRAIT' ? 'Need Trait' : 'Greed';
                                
          const requestEmbed = new EmbedBuilder()
            .setTitle('New Loot Request')
            .setDescription(`**${interaction.user.username}** has requested **${item.name}** (${requestTypeDisplay})`)
            .addFields(
              { name: 'Item Type', value: item.type || 'Unknown', inline: true },
              { name: 'Request Type', value: requestTypeDisplay, inline: true },
              { 
                name: '⏰ Roll Timer',
                value: timeRemaining || formatTimerDuration(item.timer_duration || 1440),
                inline: true
              }
            )
            .setColor('#9c27b0')
            .setTimestamp()
            .setFooter({ text: `Request ID: ${requestId}` });
          
          if (item.trait) {
            requestEmbed.addFields({ name: 'Trait', value: item.trait, inline: true });
          }
          
          if (item.icon) {
            requestEmbed.setThumbnail(item.icon);
          }
          
          // Create approve/deny action buttons
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`approve_loot_${requestId}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`deny_loot_${requestId}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
            );
          
          await sendNotificationToConfiguredChannel(
            appGuildId, 
            discordGuildId, 
            'loot', 
            requestEmbed,
            null,
            [row]
          );
          
          await interaction.editReply(`Your ${requestTypeDisplay} request for **${item.name}** has been submitted!`);
        } catch (error) {
          console.error(`[ERROR] Error processing item request:`, error);
          await interaction.editReply('An error occurred while processing your request.');
        }
      }
      
      // Handle approve_loot button
      // Handle approve_loot button
      else if (customId.startsWith('approve_loot_')) {
        const requestId = customId.replace('approve_loot_', '');
        
        try {
          try {
            await interaction.deferReply();
          } catch (deferError) {
            console.warn(`Warning: Could not defer reply: ${deferError.message}`);
          }
          
          const discordGuildId = interaction.guild?.id;
          
          const mappingResult = await pool.query(
            'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
            [discordGuildId]
          );
          
          if (!mappingResult.rows.length) {
            return await interaction.editReply({
              content: 'This Discord server is not linked to an application guild.'
            }).catch(console.error);
          }
          
          const appGuildId = mappingResult.rows[0].app_guild_id;
          
          const requestResult = await pool.query(
            `SELECT lr.*, 
                  gsi.quantity, 
                  i.name as item_name,
                  u.username, u.discord_id,
                  gsi.id as storage_item_id
            FROM loot_requests lr
            JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
            JOIN items i ON gsi.item_id = i.id
            JOIN users u ON lr.user_id = u.id
            WHERE lr.id = $1 AND lr.guild_id = $2`,
            [requestId, appGuildId]
          );
          
          if (!requestResult.rows || requestResult.rows.length === 0) {
            return await interaction.editReply({
              content: 'Request not found or already processed.'
            }).catch(console.error);
          }
          
          const request = requestResult.rows[0];
          const storageItemId = request.storage_item_id;
          
          const willReachZero = request.quantity <= 1;
          console.log(`[DEBUG] Item quantity: ${request.quantity}, Will reach zero: ${willReachZero}`);
          
          const dbClient = await pool.connect();
          try {
            await dbClient.query('BEGIN');
            
            await dbClient.query(
              `UPDATE loot_requests 
              SET status = 'Approved', updated_at = NOW()
              WHERE id = $1`,
              [requestId]
            );
            
            if (willReachZero) {
              console.log(`[INFO] Item ${storageItemId} quantity will reach zero - removing from storage`);
              
              await dbClient.query(
                `UPDATE loot_requests 
                SET status = 'Denied - Out of Stock', updated_at = NOW()
                WHERE storage_item_id = $1 AND status = 'Pending'`,
                [storageItemId]
              );

              await dbClient.query(
                `DELETE FROM guild_storage_items WHERE id = $1`,
                [storageItemId]
              );
            } else {
              await dbClient.query(
                `UPDATE guild_storage_items
                SET quantity = quantity - 1, updated_at = NOW()
                WHERE id = $1`,
                [storageItemId]
              );
              await dbClient.query(
                `UPDATE loot_requests 
                SET status = 'Denied - Granted to other', updated_at = NOW()
                WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
                [storageItemId, requestId]
              );
            }
            
            await dbClient.query('COMMIT');
            console.log(`[INFO] Transaction committed successfully`);
          } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error(`[ERROR] Transaction rolled back: ${error.message}`);
            throw error;
          } finally {
            dbClient.release();
          }

          try {
            await markItemAsClaimed(storageItemId, request.username);
          } catch (uiError) {
            console.warn(`Warning: Could not update UI: ${uiError.message}`);
            // Continue anyway - this is not critical
          }

          try {
            if (request.discord_id) {
              const user = await interaction.client.users.fetch(request.discord_id);
              await user.send(`✅ Your request for **${request.item_name}** has been approved!`).catch(err => 
                console.log(`Could not DM user ${request.discord_id}: ${err.message}`)
              );
            }
          } catch (dmError) {
            console.error(`Failed to DM user: ${dmError.message}`);
          }
          
          const responseMessage = willReachZero
            ? `✅ Loot request approved. **${request.item_name}** will be given to **${request.username}**. This was the last available item.`
            : `✅ Loot request approved. **${request.item_name}** will be given to **${request.username}**.`;

          try {
            await interaction.editReply({
              content: responseMessage
            });
          } catch (replyError) {
            console.warn(`Warning: Could not edit reply: ${replyError.message}`);
            try {
              await interaction.followUp({
                content: responseMessage
              });
            } catch (followUpError) {
              console.error(`Error sending followup: ${followUpError.message}`);
            }
          }
        } catch (error) {
          console.error(`[ERROR] Error approving request:`, error);
          try {
            await interaction.editReply({
              content: 'An error occurred while approving the request.'
            }).catch(console.error);
          } catch (replyError) {
            console.error(`Error sending error message: ${replyError.message}`);
          }
        }
      }
      
      else if (customId.startsWith('deny_loot_')) {
        const requestId = customId.replace('deny_loot_', '');
        await interaction.deferReply();
        
        try {
          const discordGuildId = interaction.guild?.id;
          const mappingResult = await pool.query(
            'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
            [discordGuildId]
          );
          
          if (!mappingResult.rows.length) {
            return await interaction.editReply('This Discord server is not linked to an application guild.');
          }
          
          const appGuildId = mappingResult.rows[0].app_guild_id;
          
          // Get request details
          const requestResult = await pool.query(
            `SELECT lr.*, 
                  i.name as item_name,
                  u.username, u.discord_id
            FROM loot_requests lr
            JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
            JOIN items i ON gsi.item_id = i.id
            JOIN users u ON lr.user_id = u.id
            WHERE lr.id = $1 AND lr.guild_id = $2`,
            [requestId, appGuildId]
          );
          
          if (!requestResult.rows || requestResult.rows.length === 0) {
            return await interaction.editReply('Request not found or already processed.');
          }
          
          const request = requestResult.rows[0];
          
          // Update request status
          await pool.query(
            `UPDATE loot_requests 
            SET status = 'Denied', updated_at = NOW()
            WHERE id = $1`,
            [requestId]
          );
          
          // Send notification to user
          if (request.discord_id) {
            try {
              const user = await interaction.client.users.fetch(request.discord_id);
              await user.send(`❌ Your request for **${request.item_name}** has been denied.`);
            } catch (dmError) {
              console.error(`Failed to DM user: ${dmError.message}`);
            }
          }
          
          await interaction.editReply({
            content: `❌ Loot request from **${request.username}** for **${request.item_name}** has been denied.`
          });
        } catch (error) {
          console.error(`[ERROR] Error denying request:`, error);
          await interaction.editReply('An error occurred while denying the request.');
        }
      }
      
      // Handle setup_wizard button
      else if (customId === 'setup_wizard') {
        const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}`;
        
        await interaction.reply({
          content: `Click the link below to connect this Discord server to your application guild:`,
          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setURL(setupUrl)
                  .setLabel('Open Setup Page')
                  .setStyle(ButtonStyle.Link)
              )
          ],
          ephemeral: true
        });
      }
    }
    // Handle select menu interactions
    else if (interaction.isSelectMenu()) {
      const customId = interaction.customId;
      
      // Handle different select menu interactions
      if (customId === 'role_select') {
        const role = interaction.values[0];
        await interaction.reply({
          content: `You selected the role: ${role}`,
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      const errorMessage = 'There was an error processing your request.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error sending error response:', replyError);
    }
  }
});

async function handleEventSignup(interaction, build, userId, eventId, role, eventDetails, appGuildId, isUpdate = false) {
  try {
    // Verify the build has the required fields
    if (!build || !build.primary || !build.secondary || !build.weapon_spec) {
      const method = isUpdate ? 'update' : 'editReply';
      await interaction[method]({
        content: 'Invalid build data. Please ensure your build has primary and secondary weapons and a class specified.',
        components: []
      });
      return;
    }
    
    // Check if user is already signed up
    const existingSignup = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    
    // Determine weapon_spec to use (the format the database expects)
    const weaponCombo = `${build.primary}|${build.secondary}`;
    const reverseWeaponCombo = `${build.secondary}|${build.primary}`;
    
    // Check which weapon combo matches the weapon_spec in WEAPON_SPECS
    let dbWeaponSpec = weaponCombo;
    if (WEAPON_SPECS[reverseWeaponCombo] === build.weapon_spec) {
      dbWeaponSpec = reverseWeaponCombo;
    }
    
    // Check role capacity
    const roleCountsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE role = 'TANK') as tank_count,
        COUNT(*) FILTER (WHERE role = 'HEALER') as healer_count,
        COUNT(*) FILTER (WHERE role = 'DPS') as dps_count
      FROM event_participants
      WHERE event_id = $1`,
      [eventId]
    );
    
    const roleCounts = roleCountsResult.rows[0];
    
    // Verify there's room for this role
    const roleLimits = {
      'TANK': eventDetails.tanks || 0,
      'HEALER': eventDetails.healers || 0,
      'DPS': eventDetails.dps || 0
    };
    
    const currentCounts = {
      'TANK': parseInt(roleCounts?.tank_count || 0),
      'HEALER': parseInt(roleCounts?.healer_count || 0),
      'DPS': parseInt(roleCounts?.dps_count || 0)
    };
    
    // Skip the capacity check if the user is already signed up (just updating)
    if (!existingSignup.rows?.length && currentCounts[role] >= roleLimits[role] && roleLimits[role] > 0) {
      const method = isUpdate ? 'update' : 'editReply';
      await interaction[method]({
        content: `Sorry, the ${role} spots are full for this event.`,
        components: []
      });
      return;
    }
    
    if (existingSignup.rows?.length > 0) {
      // Update existing signup
      await pool.query(
        'UPDATE event_participants SET role = $1, weapon_spec = $2 WHERE event_id = $3 AND user_id = $4',
        [role, dbWeaponSpec, eventId, userId]
      );
      
      const method = isUpdate ? 'update' : 'editReply';
      await interaction[method]({
        content: `Your role for "${eventDetails.title}" has been updated to ${role} (${build.weapon_spec}).`,
        components: []
      });
    } else {
      // Create new signup
      await pool.query(
        `INSERT INTO event_participants 
          (id, guild_id, event_id, user_id, role, weapon_spec, created_at, updated_at)
        VALUES
          (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
        [appGuildId, eventId, userId, role, dbWeaponSpec]
      );
      
      const method = isUpdate ? 'update' : 'editReply';
      await interaction[method]({
        content: `You have been signed up for "${eventDetails.title}" as ${role} (${build.weapon_spec}).`,
        components: []
      });
    }
    
    // Update event display
    await updateEventDisplay(interaction, eventId, eventDetails, appGuildId);
  } catch (error) {
    console.error('Error in handleEventSignup:', error);
    const method = isUpdate ? 'update' : 'editReply';
    await interaction[method]({
      content: 'An error occurred while processing your signup. Please try again.',
      components: []
    });
  }
}

// Register slash commands
const registerCommands = async () => {
  try {
    // Commands structure
    const commands = [
      // Link command - only for server admins
      {
        name: 'link-guild',
        description: 'Link this Discord server to your application guild',
        options: [
          {
            name: 'join_code',
            description: 'The join code from your guild settings',
            type: 3, // STRING
            required: true
          }
        ]
      },
      // Storage commands
      {
        name: 'storage',
        description: 'View guild storage',
        options: [
          {
            name: 'item',
            description: 'Search for a specific item',
            type: 3,
            required: false
          }
        ]
      },
      // Event commands
      {
        name: 'events',
        description: 'View upcoming events',
        options: [
          {
            name: 'id',
            description: 'Get details for a specific event by ID',
            type: 3,
            required: false
          }
        ]
      },
      {
        name: 'event-signup',
        description: 'Sign up for an event',
        options: [
          {
            name: 'event_id',
            description: 'Event ID',
            type: 3,
            required: true
          },
          {
            name: 'role',
            description: 'Your role in the event',
            type: 3,
            required: true,
            choices: [
              { name: 'Tank', value: 'TANK' },
              { name: 'Healer', value: 'HEALER' },
              { name: 'DPS', value: 'DPS' }
            ]
          }
        ]
      },
      // Teams commands
      {
        name: 'teams',
        description: 'View teams for an event',
        options: [
          {
            name: 'event_id',
            description: 'Event ID',
            type: 3,
            required: true
          }
        ]
      },
      // Members command
      {
        name: 'members',
        description: 'View guild members',
        options: []
      },
      // Connection check
      {
        name: 'check-connection',
        description: 'Check if this Discord server is connected to a guild',
        options: []
      },
      // Channel configuration
      {
        name: 'config-channel',
        description: 'Configure which channels to send notifications to',
        options: [
          {
            name: 'type',
            description: 'Type of notification',
            type: 3, // STRING
            required: true,
            choices: [
              { name: 'Storage/Items', value: 'storage' },
              { name: 'Events', value: 'events' },
              { name: 'Loot Requests', value: 'loot' },
              { name: 'Announcements', value: 'announcements' }
            ]
          },
          {
            name: 'channel',
            description: 'The channel to send notifications to',
            type: 7, // CHANNEL
            required: true
          },
          {
            name: 'enabled',
            description: 'Enable or disable notifications',
            type: 5, // BOOLEAN
            required: false
          }
        ]
      },
      // Class command
      {
        name: 'class',
        description: 'View or set your preferred character class',
        options: [
          {
            name: 'view',
            description: 'View your current preferred class',
            type: 1 // SUB_COMMAND
          },
          {
            name: 'set',
            description: 'Set your preferred class',
            type: 1 // SUB_COMMAND
          },
          {
            name: 'reset',
            description: 'Reset your preferred class',
            type: 1 // SUB_COMMAND
          }
        ]
      }
    ];

    const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1333905158496587816';
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    console.log('Started refreshing application (/) commands.');
    
    // Updated with dual registration logic
    if (IS_DEV && TEST_GUILD_ID) {
      // Development: Register to test guild for instant updates
      console.log(`Registering commands to test guild: ${TEST_GUILD_ID}`);
      
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
        { body: commands },
      );
      
      console.log('Successfully reloaded guild commands for development.');
    } else {
      // Production: Register globally (takes up to an hour to propagate)
      console.log('Registering global commands...');
      
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );
      
      console.log('Successfully reloaded global application commands.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

client.on('interactionCreate', async (interaction) => {
  // Check if it's a select menu interaction for class selection
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('class_select_')) {
    try {
      const userId = interaction.customId.replace('class_select_', '');
      const selectedWeaponCombo = interaction.values[0];
      const selectedClassName = WEAPON_SPECS[selectedWeaponCombo] || 'Unknown';
      
      // Save the preference
      await pool.query(
        `INSERT INTO user_preferences (user_id, preferred_weapon_spec)
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           preferred_weapon_spec = $2,
           updated_at = NOW()`,
        [userId, selectedWeaponCombo]
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
      
      await interaction.update({ 
        content: 'Class preference saved!',
        embeds: [embed],
        components: [] 
      });
    } catch (error) {
      console.error('Error handling class selection:', error);
      await interaction.update({ 
        content: 'Error saving class preference.',
        components: [] 
      });
    }
  }
});

// Helper function to authenticate and get a session
async function getAuthSession() {
  try {
    // Try token-based authentication first
    try {
      console.log('Attempting token authentication');
      const tokenResponse = await axios.post(`${API_URL}/auth/bot-token`, {
        botSecret: process.env.DISCORD_CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        httpAgent: new require('http').Agent({ family: 4 }),
        httpsAgent: new require('https').Agent({ family: 4 })
      });
      
      if (tokenResponse.data && tokenResponse.data.token) {
        console.log('Token authentication successful');
        return ['Authorization=Bearer ' + tokenResponse.data.token];
      }
    } catch (tokenError) {
      console.log('Token auth failed, trying session auth:', tokenError.message);
    }
    
    // Fall back to session-based authentication
    console.log('Sending bot login request with data:', JSON.stringify({ botSecret: 'REDACTED' }));
    const loginResponse = await axios.post(`${API_URL}/auth/bot-login`, {
      botSecret: process.env.DISCORD_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpAgent: new require('http').Agent({ family: 4 }),
      httpsAgent: new require('https').Agent({ family: 4 })
    });
    
    console.log('Login response received:', loginResponse.status);
    return loginResponse.headers['set-cookie'];
  } catch (error) {
    console.error('Authentication error:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    return null;
  }
}

// Helper function to get the app guild ID from a Discord guild ID
async function getGuildMapping(discordGuildId) {
  try {
    console.log(`Checking mapping for Discord guild: ${discordGuildId}`);
    
    // Query the database directly instead of going through API
    try {
      const result = await pool.query(
        'SELECT discord_guild_id, app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
        [discordGuildId.toString()]
      );
      
      if (result.rows && result.rows.length > 0) {
        console.log('Direct database mapping found:', result.rows[0]);
        return result.rows[0].app_guild_id;
      } else {
        console.log('No mapping found in database');
      }
    } catch (dbError) {
      console.error('Database query error:', dbError.message);
    }
    
    // API fallback is too unreliable with IPv6 issues, so we'll skip it
    return null;
  } catch (error) {
    console.error('Error getting guild mapping:', error.message);
    return null;
  }
}

// Slash command and interaction handler
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isCommand()) {
      const { commandName, options } = interaction;
      
      // Handle link-guild command (special case)
      if (commandName === 'link-guild') {
        await handleLinkGuildCommand(interaction);
        return;
      }
      
      // Handle help command (no guild required)
      if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('Tevent Guild Management Bot')
          .setColor('#90caf9')
          .setDescription('Manage your Tevent guild directly from Discord')
          .addFields([
            { name: '/setup', value: 'Link this Discord server to your Tevent guild (Admin only)' },
            { name: '/storage', value: 'Display items in the guild storage' },
            { name: '/events', value: 'View upcoming events' },
            { name: '/event-signup', value: 'Sign up for an event' },
            { name: '/teams', value: 'View teams for an event' },
            { name: '/members', value: 'View guild members' },
            { name: '/help', value: 'Show this help message' }
          ])
          .setFooter({ text: 'Tevent.app - Guild Management Made Easy' });
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      // For all other commands, check if this Discord server is linked
      const discordGuildId = interaction.guild?.id;
      
      if (!discordGuildId) {
        return await interaction.reply({ 
          content: 'This command must be used in a Discord server.',
          ephemeral: true 
        });
      }
      
      // Get linked guild ID from database
      const appGuildId = await getGuildMapping(discordGuildId);
      
      if (!appGuildId) {
        return await interaction.reply({ 
          content: 'This Discord server is not linked to an application guild. An admin needs to use the `/setup` command first.',
          ephemeral: true 
        });
      }
      
      // Handle commands with direct DB access
      if (commandName === 'storage') {
        await handleStorageCommand(interaction, appGuildId);
      }
      else if (commandName === 'events') {
        await handleEventsCommand(interaction, appGuildId);
      }
      else if (commandName === 'event-signup') {
        await handleEventSignupCommand(interaction, appGuildId);
      }
      else if (commandName === 'teams') {
        await handleTeamsCommand(interaction, appGuildId);
      }
      else if (commandName === 'members') {
        await handleMembersCommand(interaction, appGuildId);
      }
      else if (commandName === 'config-channel') {
        await handleConfigChannelCommand(interaction, appGuildId);
      }
      else if (commandName === 'check-connection') {
        await handleCheckConnectionCommand(interaction, appGuildId);
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      const customId = interaction.customId;
      
      // Handle item request buttons (Need/Greed)
      if (customId.startsWith('need_item_') || customId.startsWith('greed_item_')) {
        const itemId = customId.replace(/^(need_item_|greed_item_)/, '');
        const isNeed = customId.startsWith('need_item_');
        const priority = isNeed ? 'Need' : 'Greed';
        const priorityField = isNeed ? 'need_count' : 'greed_count';
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
          // Get Discord server ID and app guild ID
          const discordGuildId = interaction.guild?.id;
          
          // Get appGuildId from database
          const mappingResult = await pool.query(
            'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
            [discordGuildId]
          );
          
          if (!mappingResult.rows.length) {
            return await interaction.editReply('This Discord server is not linked to an application guild.');
          }
          
          const appGuildId = mappingResult.rows[0].app_guild_id;
          
          // Get user by Discord ID
          const userResult = await pool.query(
            'SELECT id, username FROM users WHERE discord_id = $1',
            [interaction.user.id]
          );
          
          if (!userResult.rows.length) {
            return await interaction.editReply('You need to register on the website first before requesting items.');
          }
          
          const userId = userResult.rows[0].id;
          
          // Check if item is available
          const itemResult = await pool.query(
            `SELECT gsi.*, i.name 
             FROM guild_storage_items gsi
             JOIN items i ON gsi.item_id = i.id
             WHERE gsi.id = $1`,
            [itemId]
          );
          
          if (!itemResult.rows.length || itemResult.rows[0].quantity < 1) {
            return await interaction.editReply('This item is no longer available.');
          }
          
          const item = itemResult.rows[0];
          
          // Check for existing request
          const existingRequestResult = await pool.query(
            `SELECT id, priority FROM loot_requests 
             WHERE storage_item_id = $1 AND user_id = $2 AND status = 'Pending'`,
            [itemId, userId]
          );
          
          if (existingRequestResult.rows.length) {
            const existingPriority = existingRequestResult.rows[0].priority === 1 ? 'Need' : 'Greed';
            
            if (existingPriority === priority) {
              return await interaction.editReply(`You already have a ${priority} request for "${item.name}".`);
            }
            
            // User is changing priority, update the existing request
            await pool.query(
              `UPDATE loot_requests 
               SET priority = $1, updated_at = NOW()
               WHERE id = $2`,
              [isNeed ? 1 : 0, existingRequestResult.rows[0].id]
            );
            
            // Update the counter in the tracking table
            const dbClient = await pool.connect();
            try {
              await dbClient.query('BEGIN');
              
              // Decrement old priority counter
              const oldPriorityField = existingPriority === 'Need' ? 'need_count' : 'greed_count';
              await dbClient.query(
                `UPDATE item_message_tracking 
                 SET ${oldPriorityField} = GREATEST(${oldPriorityField} - 1, 0),
                     ${priorityField} = ${priorityField} + 1,
                     updated_at = NOW()
                 WHERE item_id = $1`,
                [itemId]
              );
              
              await dbClient.query('COMMIT');
            } catch (error) {
              await dbClient.query('ROLLBACK');
              throw error;
            } finally {
              dbClient.release();
            }
            
            // Update the embed
            await updateItemEmbed(itemId);
            
            return await interaction.editReply(`Your request for "${item.name}" has been updated from ${existingPriority} to ${priority}.`);
          }
          
          // Create new loot request
          const requestResult = await pool.query(
            `INSERT INTO loot_requests
             (id, guild_id, storage_item_id, user_id, status, priority, created_at, updated_at)
             VALUES
             (gen_random_uuid(), $1, $2, $3, 'Pending', $4, NOW(), NOW())
             RETURNING id`,
            [appGuildId, itemId, userId, isNeed ? 1 : 0]
          );
          
          const requestId = requestResult.rows[0].id;
          
          // Update the counter in the tracking table
          await pool.query(
            `UPDATE item_message_tracking 
             SET ${priorityField} = ${priorityField} + 1,
                 updated_at = NOW()
             WHERE item_id = $1`,
            [itemId]
          );
          
          // Update the item embed with new request count
          await updateItemEmbed(itemId);
          
          // Send notification to loot channel with approve/deny buttons
          const requestEmbed = new EmbedBuilder()
            .setTitle('New Loot Request')
            .setDescription(`**${interaction.user.username}** has requested **${item.name}** (${priority})`)
            .setColor('#9c27b0')
            .setTimestamp()
            .setFooter({ text: `Request ID: ${requestId}` });
          
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`approve_loot_${requestId}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`deny_loot_${requestId}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
            );
          
          await sendNotificationToConfiguredChannel(
            appGuildId, 
            discordGuildId, 
            'loot', 
            requestEmbed,
            null,
            [row]
          );
          
          await interaction.editReply(`Your ${priority} request for **${item.name}** has been submitted!`);
        } catch (error) {
          console.error(`[ERROR] Error processing item request:`, error);
          await interaction.editReply('An error occurred while processing your request.');
        }
      }
      
      // Handle approve_loot button
      else if (customId.startsWith('approve_loot_')) {
        const requestId = customId.replace('approve_loot_', '');
        const discordGuildId = interaction.guild?.id;
        const userId = interaction.user.id;
        
        // IMMEDIATELY acknowledge the interaction first - this is critical
        await interaction.reply({ 
          content: "Processing loot request...",
          ephemeral: true 
        }).catch(error => {
          console.error(`Initial reply error: ${error.message}`);
          // Continue anyway since we'll process the request
        });
        
        // Now perform the actual processing - don't wait on this in the interaction handler
        processLootApproval(requestId, discordGuildId, interaction.channelId, client)
          .then(result => {
            // Try to edit the reply, but don't worry if it fails
            interaction.editReply(result.message).catch(() => {});
            
            // Post a public confirmation in the channel
            interaction.channel.send(result.publicMessage).catch(error => {
              console.error(`Error sending public confirmation: ${error.message}`);
            });
          })
          .catch(error => {
            console.error(`Error in loot approval process: ${error.message}`);
            interaction.editReply("An error occurred while processing the request.").catch(() => {});
          });
      }
      
      // Handle deny_loot button
      else if (customId.startsWith('deny_loot_')) {
        const requestId = customId.replace('deny_loot_', '');
        await interaction.deferReply();
        
        try {
          const discordGuildId = interaction.guild?.id;
          const mappingResult = await pool.query(
            'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
            [discordGuildId]
          );
          
          if (!mappingResult.rows.length) {
            return await interaction.editReply('This Discord server is not linked to an application guild.');
          }
          
          const appGuildId = mappingResult.rows[0].app_guild_id;
          
          // Get request details
          const requestResult = await pool.query(
            `SELECT lr.*, 
                  i.name as item_name,
                  u.username, u.discord_id
            FROM loot_requests lr
            JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
            JOIN items i ON gsi.item_id = i.id
            JOIN users u ON lr.user_id = u.id
            WHERE lr.id = $1 AND lr.guild_id = $2`,
            [requestId, appGuildId]
          );
          
          if (!requestResult.rows || requestResult.rows.length === 0) {
            return await interaction.editReply('Request not found or already processed.');
          }
          
          const request = requestResult.rows[0];
          
          // Update request status
          await pool.query(
            `UPDATE loot_requests 
            SET status = 'Denied', updated_at = NOW()
            WHERE id = $1`,
            [requestId]
          );
          
          // Send notification to user
          if (request.discord_id) {
            try {
              const user = await interaction.client.users.fetch(request.discord_id);
              await user.send(`❌ Your request for **${request.item_name}** has been denied.`);
            } catch (dmError) {
              console.error(`Failed to DM user: ${dmError.message}`);
            }
          }
          
          await interaction.editReply({
            content: `❌ Loot request from **${request.username}** for **${request.item_name}** has been denied.`
          });
        } catch (error) {
          console.error(`[ERROR] Error denying request:`, error);
          await interaction.editReply('An error occurred while denying the request.');
        }
      }
      
      // Handle setup_wizard button
      else if (customId === 'setup_wizard') {
        const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}`;
        
        await interaction.reply({
          content: `Click the link below to connect this Discord server to your application guild:`,
          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setURL(setupUrl)
                  .setLabel('Open Setup Page')
                  .setStyle(ButtonStyle.Link)
              )
          ],
          ephemeral: true
        });
      }
      
      // Handle event signup buttons
      client.on('interactionCreate', async (interaction) => {
        if (interaction.customId && interaction.customId.startsWith('signup_')) {
          try {
            // Parse event ID and role from the button's custom ID
            const [_, eventId, role] = interaction.customId.split('_');
            console.log(`[DEBUG] Processing signup for event: ${eventId}, role: ${role}`);
            
            // Immediately defer the reply to prevent timeout
            await interaction.deferReply({ ephemeral: true }).catch(error => {
              if (error.code === 10062) {
                console.log(`[WARN] Interaction ${interaction.id} already acknowledged, continuing processing`);
                return;
              }
              throw error;
            });
            
            // Check guild mapping
            const discordGuildId = interaction.guild?.id;
            if (!discordGuildId) {
              return await safeReply(interaction, {
                content: 'This button must be used in a Discord server.',
                ephemeral: true
              });
            }
            
            // Get app guild ID from mapping
            const appGuildId = await getGuildMapping(discordGuildId);
            if (!appGuildId) {
              return await safeReply(interaction, {
                content: 'This Discord server is not linked to an application guild.',
                ephemeral: true
              });
            }
      
            // Get user from discord ID
            const userResult = await pool.query(
              'SELECT id, username, builds FROM users WHERE discord_id = $1',
              [interaction.user.id]
            );
            
            if (!userResult.rows || userResult.rows.length === 0) {
              return await safeReply(interaction, {
                content: 'You need to register on the website first before signing up for events.',
                ephemeral: true
              });
            }
            
            const userId = userResult.rows[0].id;
            const username = userResult.rows[0].username;
            const userBuildsStr = userResult.rows[0].builds;
            
            // Parse user builds
            let userBuilds = [];
            try {
              userBuilds = typeof userBuildsStr === 'string' ? JSON.parse(userBuildsStr) : userBuildsStr;
              if (!Array.isArray(userBuilds)) userBuilds = [];
            } catch (e) {
              console.error(`Error parsing builds for user ${username}:`, e);
              userBuilds = [];
            }
            
            console.log(`[DEBUG] User builds: ${JSON.stringify(userBuilds)}`);
            
            // Get event details
            const eventResult = await pool.query(
              'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
              [eventId, appGuildId]
            );
            
            if (!eventResult.rows || eventResult.rows.length === 0) {
              return await safeReply(interaction, {
                content: 'Event not found.',
                ephemeral: true
              });
            }
            
            const eventDetails = eventResult.rows[0];
            
            // Special handling for ABSENT and TENTATIVE roles
            if (role === 'ABSENT') {
              // Remove from participants
              await pool.query(
                'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
              
              await pool.query(
                `INSERT INTO event_absentees 
                  (id, guild_id, event_id, user_id, created_at, updated_at)
                VALUES 
                  (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                ON CONFLICT (event_id, user_id) DO NOTHING`,
                [appGuildId, eventId, userId]
              );
              
              await safeReply(interaction, {
                content: `You have been marked as absent for "${eventDetails.title}".`,
                ephemeral: true
              });
              
              // Update event display
              await updateEventDisplay(interaction, eventId, eventDetails, appGuildId);
              return;
            } 
            else if (role === 'TENTATIVE') {
              // Handle tentative signup
              try {
                // Check if we have a tentative table, if not create one
                await pool.query(`
                  CREATE TABLE IF NOT EXISTS event_tentative (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    guild_id UUID NOT NULL,
                    event_id UUID NOT NULL, 
                    user_id UUID NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(event_id, user_id)
                  )
                `);
                
                // Remove from participants and absentees
                await pool.query(
                  'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
                  [eventId, userId]
                );
                
                await pool.query(
                  'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
                  [eventId, userId]
                );
                
                // Add to tentative
                await pool.query(
                  `INSERT INTO event_tentative 
                    (id, guild_id, event_id, user_id, created_at, updated_at)
                  VALUES
                    (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                  ON CONFLICT (event_id, user_id) DO UPDATE SET
                    updated_at = NOW()`,
                  [appGuildId, eventId, userId]
                );
                
                await safeReply(interaction, {
                  content: `You have been marked as tentative for "${eventDetails.title}".`,
                  ephemeral: true
                });
                
                // Update event display
                await updateEventDisplay(interaction, eventId, eventDetails, appGuildId);
              } catch (tentativeError) {
                console.error('Error handling tentative signup:', tentativeError);
                await safeReply(interaction, {
                  content: `An error occurred while marking you as tentative.`,
                  ephemeral: true
                });
              }
              return;
            }
            
            // For regular signup roles (TANK, HEALER, DPS):
            
            // Filter builds by the selected role - CASE INSENSITIVE COMPARISON
            const roleSpecificBuilds = userBuilds.filter(build => 
              build.spec && build.spec.toUpperCase() === role.toUpperCase()
            );
            
            console.log(`[DEBUG] Role-specific builds for ${role}: ${JSON.stringify(roleSpecificBuilds)}`);
            
            // Also get builds with no spec or "Any" spec as fallbacks
            const genericBuilds = userBuilds.filter(build => 
              !build.spec || (build.spec && build.spec.toUpperCase() === 'ANY')
            );
            
            console.log(`[DEBUG] Generic builds: ${JSON.stringify(genericBuilds)}`);
            
            // Combine role-specific builds first, then generic builds
            const compatibleBuilds = [...roleSpecificBuilds, ...genericBuilds];
            
            console.log(`[DEBUG] Compatible builds for ${role}: ${JSON.stringify(compatibleBuilds)}`);
            
            if (compatibleBuilds.length === 0) {
              return await safeReply(interaction, {
                content: `You don't have any builds configured for the ${role} role. Please configure your builds on the website first.`,
                ephemeral: true
              });
            }
            
            // If there's exactly one compatible build, use it automatically
            if (compatibleBuilds.length === 1) {
              await handleEventSignup(interaction, compatibleBuilds[0], userId, eventId, role, eventDetails, appGuildId);
            }
            // Only show selection menu if there are multiple compatible builds
            else {
              // Create selection menu for builds
              const options = compatibleBuilds.map((build, index) => ({
                label: build.weapon_spec || `Build ${index + 1}`,
                description: `${build.primary} + ${build.secondary}${build.spec ? ` (${build.spec})` : ''}`,
                value: `${index}`  // Use index as the value
              }));
              
              const row = new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId(`build_select_${userId}_${eventId}_${role}`)
                    .setPlaceholder('Select your build')
                    .addOptions(options)
                );
              
              await safeReply(interaction, {
                content: `Please select which build to use for ${role}:`,
                components: [row],
                ephemeral: true
              });
            }
          } catch (error) {
            console.error(`Error processing signup button:`, error);
            await safeReply(interaction, {
              content: 'An error occurred while processing your signup. Please try again.',
              ephemeral: true
            });
          }
        }
        // Handle build selection for signup
        else if (interaction.isStringSelectMenu() && 
                 interaction.customId.startsWith('build_select_')) {
          try {
            const [_, userId, eventId, role] = interaction.customId.split('_');
            const selectedBuildIndex = parseInt(interaction.values[0]);
            
            console.log(`[DEBUG] Processing build selection - User: ${userId}, Event: ${eventId}, Role: ${role}, Build Index: ${selectedBuildIndex}`);
            
            // Get app guild ID
            const appGuildId = await getGuildMapping(interaction.guild.id);
            if (!appGuildId) {
              await interaction.update({
                content: 'Error: Could not find guild mapping.',
                components: []
              });
              return;
            }
            
            // Get user's builds
            const userResult = await pool.query(
              'SELECT builds FROM users WHERE id = $1',
              [userId]
            );
            
            if (!userResult.rows?.length) {
              await interaction.update({
                content: 'Error: User not found.',
                components: []
              });
              return;
            }
            
            // Parse builds
            let userBuilds = [];
            try {
              userBuilds = typeof userResult.rows[0].builds === 'string' 
                ? JSON.parse(userResult.rows[0].builds) 
                : userResult.rows[0].builds;
            } catch (e) {
              console.error('Error parsing builds:', e);
            }
            
            // Filter builds by the selected role - CASE INSENSITIVE COMPARISON
            const roleSpecificBuilds = userBuilds.filter(build => 
              build.spec && build.spec.toUpperCase() === role.toUpperCase()
            );
            
            // Also get builds with no spec or "Any" spec as fallbacks
            const genericBuilds = userBuilds.filter(build => 
              !build.spec || (build.spec && build.spec.toUpperCase() === 'ANY')
            );
            
            // Combine role-specific builds first, then generic builds
            const compatibleBuilds = [...roleSpecificBuilds, ...genericBuilds];
            
            if (selectedBuildIndex < 0 || selectedBuildIndex >= compatibleBuilds.length) {
              await interaction.update({
                content: 'Error: Invalid build selection.',
                components: []
              });
              return;
            }
            
            const selectedBuild = compatibleBuilds[selectedBuildIndex];
            
            // Get event details
            const eventResult = await pool.query(
              'SELECT * FROM events WHERE id = $1',
              [eventId]
            );
            
            if (!eventResult.rows?.length) {
              await interaction.update({
                content: 'Error: Event not found.',
                components: []
              });
              return;
            }
            
            const eventDetails = eventResult.rows[0];
            
            // Complete the signup process with the selected build
            await handleEventSignup(interaction, selectedBuild, userId, eventId, role, eventDetails, appGuildId, true);
          } catch (error) {
            console.error('Error handling build selection:', error);
            await interaction.update({
              content: 'An error occurred while processing your selection. Please try again.',
              components: []
            });
          }
        }
      });
    }
    // Handle select menu interactions
    else if (interaction.isSelectMenu()) {
      const customId = interaction.customId;
      
      // Handle different select menu interactions
      if (customId === 'role_select') {
        const role = interaction.values[0];
        await interaction.reply({
          content: `You selected the role: ${role}`,
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      const errorMessage = 'There was an error processing your request.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error sending error response:', replyError);
    }
  }
});

async function showClassSelectionMenu(interaction, userId, username, userBuilds, eventId, role, eventDetails, appGuildId) {
  // Extract available classes from builds
  const availableClasses = [];
  const seenClasses = new Set();
  
  userBuilds.forEach(build => {
    if (!build.weapon_spec || !build.primary || !build.secondary) return;
    
    // Check if role matches
    if (build.spec && build.spec !== role) return;
    
    // Check if build has weapon_spec directly
    const combo1 = `${build.primary}|${build.secondary}`;
    const combo2 = `${build.secondary}|${build.primary}`;
    
    if (WEAPON_SPECS[combo1] === build.weapon_spec && !seenClasses.has(build.weapon_spec)) {
      availableClasses.push({
        weaponCombo: combo1,
        className: build.weapon_spec,
        spec: build.spec || 'Any'
      });
      seenClasses.add(build.weapon_spec);
    }
    else if (WEAPON_SPECS[combo2] === build.weapon_spec && !seenClasses.has(build.weapon_spec)) {
      availableClasses.push({
        weaponCombo: combo2,
        className: build.weapon_spec,
        spec: build.spec || 'Any'
      });
      seenClasses.add(build.weapon_spec);
    }
  });
  
  console.log(`[DEBUG] Available classes for ${username}: ${JSON.stringify(availableClasses)}`);
  
  if (availableClasses.length === 0) {
    await safeReply(interaction, {
      content: `No available classes found for you as ${role}. Please set up your builds on the website.`,
      ephemeral: true
    });
    return;
  }
  
  // Create selection menu with appropriate class options
  const options = availableClasses.map(c => ({
    label: c.className,
    description: `${c.weaponCombo.replace('|', ' + ')}${c.spec !== 'Any' ? ` (${c.spec})` : ''}`,
    value: c.weaponCombo
  }));
  
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`class_select_signup_${userId}_${eventId}_${role}`)
        .setPlaceholder('Select your class')
        .addOptions(options)
    );
  
  await safeReply(interaction, {
    content: `To sign up for "${eventDetails.title}" as ${role}, please select your class:`,
    components: [row],
    ephemeral: true
  });
}

async function updateEventDisplay(interaction, eventId, eventDetails, appGuildId) {
  try {
    // Get the original message that contains the embed
    const message = interaction.message;
    if (!message || !message.embeds || message.embeds.length === 0) return;
    
    // Get updated participant data - REMOVE weapon_spec column from query
    const participantsResult = await pool.query(
      `SELECT ep.role, u.username, u.discord_id, u.builds
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = $1
       ORDER BY ep.created_at ASC`,
      [eventId]
    );
    
    // Get absentees
    const absenteesResult = await pool.query(
      `SELECT ea.user_id, u.username
       FROM event_absentees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1
       ORDER BY ea.created_at ASC`,
      [eventId]
    );
    
    // Get tentative members if the table exists
    let tentativeMembers = [];
    try {
      const tentativeResult = await pool.query(
        `SELECT et.user_id, u.username
         FROM event_tentative et
         JOIN users u ON et.user_id = u.id
         WHERE et.event_id = $1
         ORDER BY et.created_at ASC`,
        [eventId]
      );
      
      tentativeMembers = tentativeResult.rows || [];
    } catch (e) {
      // Table might not exist, ignore
    }
    
    // Create updated event object
    const updatedEvent = {
      ...eventDetails,
      participants: participantsResult.rows,
      absentees: absenteesResult.rows,
      tentative: tentativeMembers
    };
    
    // Create updated embed
    const updatedEmbed = embedBuilder.createEventEmbed(updatedEvent);
    
    // Create signup buttons with custom role emojis
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_TANK`)
          .setLabel('Tank')
          .setEmoji('1352736996405022780')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_HEALER`)
          .setLabel('Healer')
          .setEmoji('1352737011479482468')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_DPS`)
          .setLabel('DPS')
          .setEmoji('1352737043972624518')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_TENTATIVE`)
          .setLabel('Tentative')
          .setEmoji('⏳')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_ABSENT`)
          .setLabel('Absent')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Update the original message with new embed
    await message.edit({
      embeds: [updatedEmbed],
      components: [row]
    }).catch(err => {
      console.error(`[ERROR] Failed to update message with new embed: ${err.message}`);
    });
    
    console.log(`[INFO] Successfully updated event embed for event ${eventId}`);
  } catch (error) {
    console.error(`[ERROR] Error updating event display: ${error.message}`);
  }
}

app.post('/webhook/item-request', async (req, res) => {
  try {
    const { guildId, itemId, userId, username, itemName, isAutomatic, secret } = req.body;
    
    console.log(`[INFO] Received item request webhook - Item: ${itemId}, User: ${username}, Automatic: ${isAutomatic}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get item details including timer info
    const itemResult = await pool.query(
      `SELECT gsi.*, i.name, i.type 
       FROM guild_storage_items gsi
       JOIN items i ON gsi.item_id = i.id
       WHERE gsi.id = $1`,
      [itemId]
    );
    
    if (!itemResult.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    
    // Get request type information if available
    const requestTypeData = await pool.query(
      `SELECT need_or_greed FROM loot_requests 
       WHERE storage_item_id = $1 AND user_id = (SELECT id FROM users WHERE username = $2) 
       AND status = 'Pending' LIMIT 1`,
      [itemId, username]
    );
    
    const requestType = requestTypeData.rows.length > 0 ? 
      (requestTypeData.rows[0].need_or_greed === 'NEED_ITEM' ? 'Need Item' :
      requestTypeData.rows[0].need_or_greed === 'NEED_TRAIT' ? 'Need Trait' : 'Greed') :
      isAutomatic ? 'Need Item' : 'Unknown';
    
    // Format timer info
    const timeRemaining = calculateTimeRemaining(item.created_at, item.timer_duration);
    
    // Create notification embed with automatic flag indication if needed
    const requestEmbed = new EmbedBuilder()
      .setTitle(isAutomatic ? 'Automatic Loot Request' : 'New Loot Request')
      .setDescription(isAutomatic ? 
        `**${username}** has automatically requested **${item.name}** (from wishlist)` : 
        `**${username}** has requested **${item.name}**`)
      .addFields(
        { 
          name: 'Request Type', 
          value: requestType,
          inline: true
        },
        {
          name: '⏰ Roll Timer',
          value: timeRemaining || formatTimerDuration(item.timer_duration || 1440),
          inline: true
        }
      )
      .setColor(isAutomatic ? '#9370db' : '#9c27b0') // Different color for automatic requests
      .setTimestamp()
      .setFooter({ text: `Item ID: ${itemId}` });
    
    // Send notification to loot channel
    await sendNotificationToConfiguredChannel(
      guildId, 
      discordGuildId, 
      'loot', 
      requestEmbed
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[ERROR] Error processing item request webhook:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this function to discord-bot/index.js
async function recoverEventTracking() {
  try {
    console.log(`[INFO] Recovering event message tracking after restart...`);
    
    // Get all event messages from tracking table
    const eventMessagesResult = await pool.query(
      `SELECT em.*, e.* 
       FROM discord_event_messages em
       JOIN events e ON em.event_id = e.id
       WHERE e.event_time > NOW() - INTERVAL '12 hours'`  // Include recent events + upcoming ones
    );
    
    const eventMessages = eventMessagesResult.rows;
    console.log(`[INFO] Found ${eventMessages.length} event messages to recover`);
    
    for (const message of eventMessages) {
      try {
        // Try to fetch the channel
        const channel = await client.channels.fetch(message.channel_id).catch(() => null);
        if (!channel) {
          console.warn(`[WARN] Cannot find channel ${message.channel_id} for event ${message.event_id}`);
          continue;
        }
        
        // Try to fetch the message
        const discordMessage = await channel.messages.fetch(message.message_id).catch(() => null);
        if (!discordMessage) {
          console.warn(`[WARN] Cannot find message ${message.message_id} in channel ${message.channel_id}`);
          continue;
        }
        
        // Get updated participant data with names
        const participantsResult = await pool.query(
          `SELECT ep.role, u.username, u.discord_id, u.builds
           FROM event_participants ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.event_id = $1
           ORDER BY ep.created_at ASC`,
          [message.event_id]
        );
        
        // Get updated absences
        const absenteesResult = await pool.query(
          `SELECT ea.user_id, u.username
           FROM event_absentees ea
           JOIN users u ON ea.user_id = u.id
           WHERE ea.event_id = $1
           ORDER BY ea.created_at ASC`,
          [message.event_id]
        );
        
        // Group participants by role
        const tanks = participantsResult.rows.filter(p => p.role === 'TANK');
        const healers = participantsResult.rows.filter(p => p.role === 'HEALER');
        const dps = participantsResult.rows.filter(p => p.role === 'DPS');
        const absentees = absenteesResult.rows;
        
        // Format date and time
        const eventDate = new Date(message.event_time);
        const dateFormatted = `${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        const timeFormatted = `${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        const tankEmoji = '<:Tank:1352736996405022780>';
        const healerEmoji = '<:Healer:1352737011479482468>';
        const dpsEmoji = '<:DPS:1352737043972624518>';
        // Create updated embed
        const updatedEmbed = new EmbedBuilder()
          .setTitle(`${message.title || 'Event'}`)
          .setColor('#1a64f3')
          .setDescription(message.description || 'No description provided')
          .addFields(
            {
              name: '⏰ Time',
              value: `📅 ${dateFormatted} ⌚ ${timeFormatted}`,
              inline: false
            },
            {
              name: '📍 Location',
              value: message.location || 'Not specified',
              inline: false
            },
            {
              name: `${tankEmoji} Tanks (${tanks.length}/${message.tanks || 0})`,
              value: tanks.length > 0 ? 
                tanks.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
                '—',
              inline: true
            },
            {
              name: `${healerEmoji} Healers (${healers.length}/${message.healers || 0})`,
              value: healers.length > 0 ? 
                healers.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
                '—',
              inline: true
            },
            {
              name: `${dpsEmoji} DPS (${dps.length}/${message.dps || 0})`,
              value: dps.length > 0 ? 
                dps.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
                '—',
              inline: true
            },
            {
              name: `❌ Absent (${absentees.length})`,
              value: absentees.length > 0 ? 
                absentees.map((a, i) => `${i+1}. ${a.username}`).join('\n') : 
                '—',
              inline: true
            },
            {
              name: '⏳ Tentative (0)',
              value: '—',
              inline: true
            }
          )
          .setFooter({ text: `Event ID: ${message.event_id}` });
        
        // Update the embed
        await discordMessage.edit({ embeds: [updatedEmbed] });
        console.log(`[INFO] Recovered tracking for event "${message.title}" (${message.event_id})`);
      } catch (eventError) {
        console.error(`[ERROR] Error recovering event ${message.event_id}: ${eventError.message}`);
      }
    }
    
    console.log(`[INFO] Event tracking recovery complete`);
  } catch (error) {
    console.error(`[ERROR] Error in event recovery function: ${error.message}`);
    console.error(error.stack);
  }
}

async function recoverItemTracking() {
  try {
    console.log(`[INFO] Recovering item tracking after restart...`);
    
    // Get all items from tracking table
    const trackingResult = await pool.query(
      `SELECT t.*, gsi.*, i.name, i.type, i.icon 
       FROM item_message_tracking t
       JOIN guild_storage_items gsi ON t.item_id = gsi.id
       JOIN items i ON gsi.item_id = i.id
       WHERE gsi.quantity > 0`
    );
    
    const items = trackingResult.rows;
    console.log(`[INFO] Found ${items.length} active items to recover`);
    
    for (const item of items) {
      try {
        // Try to fetch the channel
        const channel = await client.channels.fetch(item.channel_id).catch(() => null);
        if (!channel) {
          console.warn(`[WARN] Cannot find channel ${item.channel_id} for item ${item.item_id}`);
          continue;
        }
        
        // Try to fetch the message
        const message = await channel.messages.fetch(item.message_id).catch(() => null);
        if (!message) {
          console.warn(`[WARN] Cannot find message ${item.message_id} in channel ${item.channel_id}`);
          continue;
        }
        
        // Update the embed with current timer information
        await updateItemEmbed(item.item_id);
        console.log(`[INFO] Recovered tracking for item ${item.name} (${item.item_id})`);
      } catch (itemError) {
        console.error(`[ERROR] Error recovering item ${item.item_id}: ${itemError.message}`);
      }
    }
    
    console.log(`[INFO] Item tracking recovery complete`);
  } catch (error) {
    console.error(`[ERROR] Error in recovery function: ${error.message}`);
    console.error(error.stack);
  }
}

// Link guild command handler
const handleLinkGuildCommand = async (interaction) => {
  // Only server admins can use this command
  if (!interaction.member.permissions.has('Administrator')) {
    return await interaction.reply({ 
      content: 'Only server administrators can link guilds.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Get the join code from the command options
    const joinCode = interaction.options.getString('join_code');
    
    if (!joinCode) {
      return await interaction.editReply({
        content: 'Please provide a valid join code. You can find this in your guild settings.',
        ephemeral: true
      });
    }
    
    console.log(`Processing link-guild command with join code: ${joinCode}`);
    
    // Use the database directly through the pool
    try {
      console.log('Attempting database connection directly...');
      
      // First find guild by join code
      const guildResult = await pool.query(
        'SELECT id, name FROM guilds WHERE join_code = $1',
        [joinCode]
      );
      
      if (!guildResult.rows || guildResult.rows.length === 0) {
        return await interaction.editReply({
          content: '❌ Invalid join code. Please check your guild settings for the correct code.',
          ephemeral: true
        });
      }
      
      const guildId = guildResult.rows[0].id;
      const guildName = guildResult.rows[0].name;
      
      console.log(`Found guild with join code ${joinCode}: ${guildId} (${guildName})`);
      
      // Check if mapping already exists
      const mappingResult = await pool.query(
        'SELECT * FROM discord_guild_mappings WHERE discord_guild_id = $1',
        [interaction.guildId]
      );
      
      if (mappingResult.rows && mappingResult.rows.length > 0) {
        // Update existing mapping
        await pool.query(
          'UPDATE discord_guild_mappings SET app_guild_id = $1, updated_at = NOW() WHERE discord_guild_id = $2',
          [guildId, interaction.guildId]
        );
        console.log(`Updated existing mapping for Discord guild ${interaction.guildId} to app guild ${guildId}`);
      } else {
        // Create new mapping with explicit UUID generation
        await pool.query(
          `INSERT INTO discord_guild_mappings 
           (id, discord_guild_id, app_guild_id, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
          [interaction.guildId, guildId]
        );
        console.log(`Created new mapping: Discord ${interaction.guildId} → App Guild ${guildId}`);
      }
      
      // Notify the user in Discord
      await interaction.editReply({
        content: `✅ Successfully linked this Discord server to guild "${guildName}"! You can now configure channel settings in the Discord tab on your guild dashboard.`,
        ephemeral: true
      });
      
      // Try to set up default channel configs
      try {
        // Find the system channel or general channel for defaults
        const guild = interaction.guild;
        let defaultChannel = guild.systemChannel;
        
        if (!defaultChannel) {
          // Try to find a channel with "general" in the name
          defaultChannel = guild.channels.cache.find(
            channel => channel.type === 0 && channel.name.includes('general')
          );
        }
        
        if (!defaultChannel) {
          // Just use the first text channel
          defaultChannel = guild.channels.cache.find(channel => channel.type === 0);
        }
        
        if (defaultChannel) {
          // Create default channel configurations
          await pool.query(
            `INSERT INTO discord_channel_config
             (id, guild_id, discord_guild_id, channel_id, channel_type, enabled, created_at, updated_at)
             VALUES 
             (gen_random_uuid(), $1, $2, $3, 'events', true, NOW(), NOW()),
             (gen_random_uuid(), $1, $2, $3, 'announcements', true, NOW(), NOW())`,
            [guildId, interaction.guildId, defaultChannel.id]
          );
          
          console.log(`Created default channel configurations using channel: ${defaultChannel.name}`);
        }
      } catch (configError) {
        console.error('Error setting up default channel configs:', configError);
        // This is non-critical, so we don't throw
      }
      
    } catch (dbError) {
      console.error('Database approach failed:', dbError);
      throw new Error(`Failed to link guild: ${dbError.message}`);
    }
    
  } catch (error) {
    console.error('Error linking guild:', error);
    
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}. Please check that your join code is correct.`,
      ephemeral: true
    });
  }
};

// Setup command handler
async function handleStorageCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    console.log(`Fetching storage items directly from database for guild: ${appGuildId}`);
    
    const itemsResult = await pool.query(
      `SELECT gsi.*, i.name, i.type, i.icon 
       FROM guild_storage_items gsi
       LEFT JOIN items i ON gsi.item_id = i.id
       WHERE gsi.guild_id = $1`,
      [appGuildId]
    );
    
    // Format the items similar to the API response
    const formattedItems = itemsResult.rows.map(item => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity || 0,
      trait: item.trait,
      dkp_cost: item.dkp_cost || 0,
      Item: {
        name: item.name,
        type: item.type || 'Unknown',
        icon: item.icon
      }
    }));

    // Get search parameter if provided
    const searchQuery = interaction.options.getString('item');
    
    // Filter items if search was provided
    let displayItems = formattedItems;
    if (searchQuery) {
      displayItems = formattedItems.filter(item => 
        item.Item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // For single item display, add reactions for requesting
    if (displayItems.length === 1 || (searchQuery && displayItems.length === 1)) {
      const item = displayItems[0];
      const embed = new EmbedBuilder()
        .setTitle(item.Item?.name || 'Unknown Item')
        .setDescription(`**Request this item by reacting with ✅**\n\nQuantity: ${item.quantity}`)
        .addFields(
          { name: 'Type', value: item.Item?.type || 'Unknown', inline: true },
          { name: 'DKP Cost', value: `${item.dkp_cost || 0}`, inline: true }
        )
        .setColor('#0099ff')
        .setFooter({ text: `Item ID: ${item.id}` });
      
      if (item.trait) {
        embed.addFields({ name: 'Trait', value: item.trait, inline: true });
      }
      
      if (item.Item?.icon) {
        embed.setThumbnail(item.Item.icon);
      }
      
      // Send message with embed
      const message = await interaction.editReply({ 
        content: 'Item details:',
        embeds: [embed],
        fetchReply: true
      });
      
      // Add request reactions
      await message.react('✅'); // Request item
      
      // Set up reaction collector (30 minute timeout)
      const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
      };
      
      const collector = message.createReactionCollector({ filter, time: 1800000 });
      
      collector.on('collect', async (reaction, user) => {
        try {
          // Get user info
          const userResult = await pool.query(
            'SELECT id FROM users WHERE discord_id = $1',
            [user.id]
          );
          
          if (!userResult.rows.length) {
            // DM the user that they need to register
            try {
              await user.send(`You need to register on the website first before requesting items.`);
            } catch (dmError) {
              console.error(`Could not DM user ${user.id}:`, dmError);
            }
            return;
          }
          
          const userId = userResult.rows[0].id;
          
          // Check if user already has a pending request for this item
          const existingRequestResult = await pool.query(
            `SELECT id FROM loot_requests 
             WHERE storage_item_id = $1 AND user_id = $2 AND status = 'Pending'`,
            [item.id, userId]
          );
          
          if (existingRequestResult.rows.length) {
            // DM the user they already have a request
            try {
              await user.send(`You already have a pending request for **${item.Item.name}**.`);
            } catch (dmError) {
              console.error(`Could not DM user ${user.id}:`, dmError);
            }
            return;
          }
          
          // Create request
          await pool.query(
            `INSERT INTO loot_requests
             (id, guild_id, storage_item_id, user_id, status, created_at, updated_at)
             VALUES
             (gen_random_uuid(), $1, $2, $3, 'Pending', NOW(), NOW())`,
            [appGuildId, item.id, userId]
          );
          
          // DM the user confirmation
          try {
            await user.send(`Your request for **${item.Item.name}** has been submitted!`);
          } catch (dmError) {
            console.error(`Could not DM user ${user.id}:`, dmError);
          }
          
          // Post the request to the configured channel if available
          await sendNotificationToConfiguredChannel(
            appGuildId, 
            interaction.guild.id, 
            'loot', 
            new EmbedBuilder()
              .setTitle('New Loot Request')
              .setDescription(`**${user.username}** has requested **${item.Item.name}**`)
              .setColor('#9c27b0')
              .setTimestamp()
          );
        } catch (error) {
          console.error('Error processing item request:', error);
          // Try to notify the user of the error
          try {
            await user.send(`There was an error processing your request for **${item.Item.name}**.`);
          } catch (dmError) {
            console.error(`Could not DM user ${user.id}:`, dmError);
          }
        }
      });
      
      return;
    }
    
    // If multiple items, display as before
    const embeds = [];
    for (let i = 0; i < Math.min(displayItems.length, 10); i++) {
      const item = displayItems[i];
      const embed = new EmbedBuilder()
        .setTitle(item.Item?.name || 'Unknown Item')
        .setDescription(`Quantity: ${item.quantity}`)
        .addFields(
          { name: 'Type', value: item.Item?.type || 'Unknown', inline: true },
          { name: 'DKP Cost', value: `${item.dkp_cost || 0}`, inline: true }
        )
        .setColor('#0099ff');
      
      if (item.trait) {
        embed.addFields({ name: 'Trait', value: item.trait, inline: true });
      }
      
      if (item.Item?.icon) {
        embed.setThumbnail(item.Item.icon);
      }
      
      embeds.push(embed);
    }
    
    if (embeds.length === 0) {
      await interaction.editReply('No items found in storage.');
    } else {
      await interaction.editReply({ 
        content: `Found ${displayItems.length} items in guild storage. Search for a specific item to request it.`,
        embeds: embeds
      });
    }
  } catch (error) {
    console.error('Error fetching storage:', error);
    await interaction.editReply('Failed to fetch guild storage items.');
  }
}

async function handleEventsCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const eventId = interaction.options.getString('id');
    
    // If specific event ID is requested, add buttons for role signups
    if (eventId) {
      const eventResult = await pool.query(
        `SELECT e.*, 
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
               (SELECT COUNT(*) FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
        FROM events e
        WHERE e.id = $1 AND e.guild_id = $2`,
        [eventId, appGuildId]
      );
      
      if (!eventResult.rows || eventResult.rows.length === 0) {
        return await interaction.editReply('Event not found.');
      }
      
      const event = eventResult.rows[0];
      const embed = EmbedBuilder.createEventEmbed({
        ...event,
        participants: {
          tank_count: event.tank_count,
          healer_count: event.healer_count,
          dps_count: event.dps_count
        }
      });
      
      // Add instruction for button signups instead of reactions
      embed.setDescription(`${event.description || 'No description provided'}\n\nUse the buttons below to sign up for this event.`);
      
      // Create signup buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_TANK`)
            .setLabel('Tank')
            .setEmoji('1352736996405022780')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_HEALER`)
            .setLabel('Healer')
            .setEmoji('1352737011479482468')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_DPS`)
            .setLabel('DPS')
            .setEmoji('1352737043972624518') 
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_TENTATIVE`)
            .setLabel('Tentative')
            .setEmoji('⏳')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`signup_${eventId}_ABSENT`)
            .setLabel('Absent')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
        );

      // Send message with buttons instead of reactions
      const message = await interaction.editReply({ 
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
      
      // Remove all reaction collector setup - we're using buttons now
      return;
    }
    
    // Get all upcoming events
    const now = new Date();
    const eventsResult = await pool.query(
      `SELECT e.*, 
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
             (SELECT COUNT(*) FROM event_participants ep 
              WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
      FROM events e
      WHERE e.guild_id = $1 AND e.event_time > $2
      ORDER BY e.event_time ASC
      LIMIT 5`,
      [appGuildId, now]
    );
    
    if (!eventsResult.rows || eventsResult.rows.length === 0) {
      await interaction.editReply('No upcoming events found.');
      return;
    }
    
    const events = eventsResult.rows;
    const embeds = events.map(event => EmbedBuilder.createEventEmbed({
      ...event,
      participants: {
        tank_count: event.tank_count,
        healer_count: event.healer_count,
        dps_count: event.dps_count
      }
    }));
    
    // Create buttons for the first event
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`signup_${events[0].id}_TANK`)
          .setLabel('Tank')
          .setEmoji('1352736996405022780')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`signup_${events[0].id}_HEALER`)
          .setLabel('Healer')
          .setEmoji('1352737011479482468')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`signup_${events[0].id}_DPS`)
          .setLabel('DPS')
          .setEmoji('1352737043972624518')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`signup_${events[0].id}_ABSENT`)
          .setLabel('Absent')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.editReply({ 
      content: 'Upcoming events:',
      embeds: embeds,
      components: [row]
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    await interaction.editReply('Failed to fetch events.');
  }
}

async function safeReply(interaction, options) {
  try {
    // Check if interaction has been deferred
    if (interaction.deferred) {
      await interaction.editReply(options).catch(error => {
        if (error.code === 10062) {
          console.log(`[WARN] Cannot edit reply - interaction ${interaction.id} unknown/expired`);
        } else {
          throw error;
        }
      });
    } 
    // Check if interaction has been replied to
    else if (interaction.replied) {
      await interaction.followUp(options).catch(error => {
        if (error.code === 10062) {
          console.log(`[WARN] Cannot follow up - interaction ${interaction.id} unknown/expired`);
        } else {
          throw error;
        }
      });
    } 
    // If not deferred or replied, send a new reply
    else {
      await interaction.reply(options).catch(error => {
        if (error.code === 10062) {
          console.log(`[WARN] Cannot reply - interaction ${interaction.id} unknown/expired`);
        } else {
          throw error;
        }
      });
    }
  } catch (error) {
    console.error(`[ERROR] Safe reply failed for interaction ${interaction.id}: ${error.message}`);
  }
}

async function handleConfigChannelCommand(interaction, appGuildId) {
  // Only admins can configure channels
  if (!interaction.member.permissions.has('Administrator')) {
    return await interaction.reply({ 
      content: 'Only server administrators can configure notification channels.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  const type = interaction.options.getString('type');
  const channel = interaction.options.getChannel('channel');
  const enabled = interaction.options.getBoolean('enabled') ?? true;
  
  // Check if channel is a text channel
  if (channel.type !== 0) {
    return await interaction.editReply({
      content: 'Please select a text channel for notifications.',
      ephemeral: true
    });
  }
  
  try {
    // First, check if we need to create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discord_channel_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL,
        discord_guild_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        channel_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Check if configuration already exists
    const existingConfig = await pool.query(
      `SELECT id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = $2`,
      [appGuildId, type]
    );
    
    if (existingConfig.rows.length > 0) {
      // Update existing config
      await pool.query(
        `UPDATE discord_channel_config 
         SET channel_id = $1, enabled = $2, updated_at = NOW()
         WHERE guild_id = $3 AND channel_type = $4`,
        [channel.id, enabled, appGuildId, type]
      );
    } else {
      // Create new config
      await pool.query(
        `INSERT INTO discord_channel_config 
         (guild_id, discord_guild_id, channel_id, channel_type, enabled)
         VALUES ($1, $2, $3, $4, $5)`,
        [appGuildId, interaction.guild.id, channel.id, type, enabled]
      );
    }
    
    await interaction.editReply({
      content: `Successfully configured ${enabled ? 'enabled' : 'disabled'} ${type} notifications in ${channel}.`,
      ephemeral: true
    });
    
    // Test notification
    const embed = new EmbedBuilder()
      .setTitle('Channel Configuration Test')
      .setDescription(`This is a test notification for ${type} events.`)
      .setColor('#4CAF50')
      .setTimestamp();
    
    try {
      await channel.send({ embeds: [embed] });
    } catch (sendError) {
      await interaction.followUp({
        content: `⚠️ Warning: Failed to send test message to ${channel}. Please check bot permissions.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error configuring channel:', error);
    await interaction.editReply({
      content: `Failed to configure notification channel: ${error.message}`,
      ephemeral: true
    });
  }
}

async function sendNotificationToConfiguredChannel(guildId, discordGuildId, type, embed, content = null, components = []) {
  try {
    console.log(`[INFO] Attempting to send ${type} notification for guild ${guildId}`);
    
    // Get the latest channel configuration from the database
    const configResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = $2 AND enabled = true
       ORDER BY updated_at DESC LIMIT 1`,
      [guildId, type]
    );
    
    if (!configResult.rows.length) {
      console.log(`[INFO] No ${type} channel configured, checking for general channel`);
      
      const generalResult = await pool.query(
        `SELECT channel_id FROM discord_channel_config 
         WHERE guild_id = $1 AND channel_type = 'general' AND enabled = true
         ORDER BY updated_at DESC LIMIT 1`,
        [guildId]
      );
      
      if (!generalResult.rows.length) {
        console.log(`[INFO] No general channel configured, trying to find any channel`);
        
        // If no general channel either, try the first configured channel of any type
        const anyChannelResult = await pool.query(
          `SELECT channel_id FROM discord_channel_config 
           WHERE guild_id = $1 AND enabled = true
           ORDER BY updated_at DESC LIMIT 1`,
          [guildId]
        );
        
        if (!anyChannelResult.rows.length) {
          console.log(`[INFO] No channels configured at all for guild ${guildId}`);
          return false;
        }
        
        const channelId = anyChannelResult.rows[0].channel_id;
        console.log(`[INFO] Using fallback channel: ${channelId}`);
        
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          console.error(`[ERROR] Fallback channel ${channelId} not found`);
          return false;
        }
        
        // THIS IS THE IMPORTANT PART - properly pass the components
        const message = await channel.send({
          content: content ? content : `📢 New ${type} notification:`,
          embeds: [embed],
          components: components
        });
        
        console.log(`[INFO] Sent ${type} notification to fallback channel ${channelId}`);
        return message;
      }
      
      const generalChannelId = generalResult.rows[0].channel_id;
      console.log(`[INFO] Using general channel: ${generalChannelId}`);
      
      const generalChannel = await client.channels.fetch(generalChannelId).catch(() => null);
      if (!generalChannel) {
        console.error(`[ERROR] General channel ${generalChannelId} not found`);
        return false;
      }
      
      // THIS IS THE IMPORTANT PART - properly pass the components
      const message = await generalChannel.send({
        content: content ? content : `📢 New ${type} notification:`,
        embeds: [embed],
        components: components
      });
      
      console.log(`[INFO] Sent ${type} notification to general channel ${generalChannelId}`);
      return message;
    }
    
    const channelId = configResult.rows[0].channel_id;
    console.log(`[INFO] Using configured channel for ${type}: ${channelId}`);
    
    // Get the channel
    const channel = await client.channels.fetch(channelId).catch((err) => {
      console.error(`[ERROR] Error fetching channel ${channelId}:`, err);
      return null;
    });
    
    if (!channel) {
      console.error(`[ERROR] Channel ${channelId} not found`);
      return false;
    }
    
    // Send notification
    console.log(`[INFO] Sending message to channel ${channelId} with components:`, JSON.stringify(components));
    const message = await channel.send({
      content: content || '',
      embeds: [embed],
      components: components
    });
    
    console.log(`[INFO] Successfully sent ${type} notification to channel ${channelId}`);
    return message;
  } catch (error) {
    console.error(`[ERROR] Error sending notification to ${type} channel:`, error);
    return false;
  }
}

async function handleEventSignupCommand(interaction, appGuildId) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const eventId = interaction.options.getString('event_id');
    const role = interaction.options.getString('role');
    const discordUserId = interaction.user.id;
    
    // Get user data including builds
    const userResult = await pool.query(
      'SELECT id, username, builds FROM users WHERE discord_id = $1',
      [discordUserId]
    );
    
    if (!userResult.rows || userResult.rows.length === 0) {
      return await interaction.editReply({
        content: 'You need to register on the website first before signing up for events.',
        ephemeral: true
      });
    }
    
    const userId = userResult.rows[0].id;
    const username = userResult.rows[0].username;
    
    // Get user's builds
    let userBuilds = [];
    try {
      userBuilds = typeof userResult.rows[0].builds === 'string' 
        ? JSON.parse(userResult.rows[0].builds) 
        : userResult.rows[0].builds;
    } catch (e) {
      console.error(`Error parsing builds for user ${username}:`, e);
    }
    
    // Validate role against builds
    if (!Array.isArray(userBuilds) || userBuilds.length === 0) {
      return await interaction.editReply({
        content: 'You have no builds configured. Please set up your builds on the website first.',
        ephemeral: true
      });
    }
    
    // Use the first build (simplified approach)
    const build = userBuilds[0];
    
    // Check if the build spec matches the requested role
    if (build.spec && build.spec.toUpperCase() !== role.toUpperCase()) {
      return await interaction.editReply({
        content: `You cannot sign up as ${role} because your build is for ${build.spec}. Please update your build on the website first.`,
        ephemeral: true
      });
    }
    
    // Get event details
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, appGuildId]
    );
    
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return await interaction.editReply({
        content: 'Event not found.',
        ephemeral: true
      });
    }
    
    const eventDetails = eventResult.rows[0];
    
    // Check if user is already signed up
    const existingSignup = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    
    // Check role capacity
    const roleCountsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE role = 'TANK') as tank_count,
        COUNT(*) FILTER (WHERE role = 'HEALER') as healer_count,
        COUNT(*) FILTER (WHERE role = 'DPS') as dps_count
      FROM event_participants
      WHERE event_id = $1`,
      [eventId]
    );
    
    const roleCounts = roleCountsResult.rows[0];
    
    // Verify there's room for this role
    const roleLimits = {
      'TANK': eventDetails.tanks || 0,
      'HEALER': eventDetails.healers || 0,
      'DPS': eventDetails.dps || 0
    };
    
    const currentCounts = {
      'TANK': parseInt(roleCounts?.tank_count || 0),
      'HEALER': parseInt(roleCounts?.healer_count || 0),
      'DPS': parseInt(roleCounts?.dps_count || 0)
    };
    
    // Skip the capacity check if the user is already signed up (just updating)
    if (!existingSignup.rows?.length && currentCounts[role] >= roleLimits[role] && roleLimits[role] > 0) {
      return await interaction.editReply({
        content: `Sorry, the ${role} spots are full for this event.`,
        ephemeral: true
      });
    }
    
    if (existingSignup.rows?.length > 0) {
      // Update existing signup
      await pool.query(
        'UPDATE event_participants SET role = $1 WHERE event_id = $2 AND user_id = $3',
        [role, eventId, userId]
      );
      
      await interaction.editReply({
        content: `Your role for "${eventDetails.title}" has been updated to ${role} (${build.weapon_spec}).`,
        ephemeral: true
      });
    } else {
      // Create new signup
      await pool.query(
        `INSERT INTO event_participants 
          (id, guild_id, event_id, user_id, role, created_at, updated_at)
        VALUES
          (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
        [appGuildId, eventId, userId, role]
      );
      
      await interaction.editReply({
        content: `You have been signed up for "${eventDetails.title}" as ${role} (${build.weapon_spec}).`,
        ephemeral: true
      });
    }
    
    // Update event display
    try {
      // Fetch the current event message
      const eventMessageResult = await pool.query(
        `SELECT channel_id, message_id FROM discord_event_messages WHERE event_id = $1`,
        [eventId]
      );
      
      if (eventMessageResult.rows.length > 0) {
        const { channel_id, message_id } = eventMessageResult.rows[0];
        
        try {
          const channel = await interaction.client.channels.fetch(channel_id);
          const message = await channel.messages.fetch(message_id);
          
          // Update the event display with fresh data
          await updateEventDisplay(message, eventId, eventDetails, appGuildId);
        } catch (messageError) {
          console.error(`[ERROR] Failed to update event message: ${messageError.message}`);
        }
      }
    } catch (displayError) {
      console.error(`[ERROR] Error updating event display: ${displayError.message}`);
    }
    
  } catch (error) {
    console.error('Error in event signup command:', error);
    await interaction.editReply({
      content: 'An error occurred while processing your signup. Please try again.',
      ephemeral: true
    });
  }
}

async function handleTeamsCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    const eventId = interaction.options.getString('event_id');
    
    // Check if event exists
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, appGuildId]
    );
    
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return await interaction.editReply(`Event with ID ${eventId} not found.`);
    }
    
    const event = eventResult.rows[0];
    
    // Get teams for this event
    const teamsResult = await pool.query(
      `SELECT t.id, t.name, t.created_at
      FROM teams t
      WHERE t.event_id = $1 AND t.guild_id = $2
      ORDER BY t.name`,
      [eventId, appGuildId]
    );
    
    if (!teamsResult.rows || teamsResult.rows.length === 0) {
      return await interaction.editReply('No teams found for this event.');
    }
    
    const teams = teamsResult.rows;
    
    // For each team, get members
    const embeds = [];
    
    for (const team of teams) {
      // Get team members with roles
      const membersResult = await pool.query(
        `SELECT tm.role, u.username 
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.position`,
        [team.id]
      );
      
      const members = membersResult.rows;
      
      // Group members by role
      const tanks = members.filter(m => m.role === 'TANK').map(m => m.username);
      const healers = members.filter(m => m.role === 'HEALER').map(m => m.username);
      const dps = members.filter(m => m.role === 'DPS').map(m => m.username);
      
      const embed = new EmbedBuilder()
        .setTitle(`Team: ${team.name}`)
        .setColor('#0099ff')
        .addFields(
          { name: 'Tanks', value: tanks.length > 0 ? tanks.join('\n') : 'None', inline: true },
          { name: 'Healers', value: healers.length > 0 ? healers.join('\n') : 'None', inline: true },
          { name: 'DPS', value: dps.length > 0 ? dps.join('\n') : 'None', inline: true }
        )
        .setFooter({ text: `Team ID: ${team.id}` })
        .setTimestamp(new Date(team.created_at));
      
      embeds.push(embed);
    }
    
    await interaction.editReply({
      content: `Teams for event "${event.title}":`,
      embeds: embeds.slice(0, 10) // Discord limits to 10 embeds
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    await interaction.editReply('Failed to fetch teams for this event.');
  }
}

async function handleMembersCommand(interaction, appGuildId) {
  await interaction.deferReply();
  
  try {
    // Get guild members with roles
    const membersResult = await pool.query(
      `SELECT gm.role, u.username, u.discord_id, u.avatar_url
      FROM guild_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.guild_id = $1
      ORDER BY CASE
        WHEN gm.role = 'Guild Master' THEN 1
        WHEN gm.role = 'Guild Advisor' THEN 2
        WHEN gm.role = 'Guild Guardian' THEN 3
        ELSE 4
      END, u.username`,
      [appGuildId]
    );
    
    if (!membersResult.rows || membersResult.rows.length === 0) {
      return await interaction.editReply('No members found for this guild.');
    }
    
    const members = membersResult.rows;
    
    // Group members by role
    const guildMasters = members.filter(m => m.role === 'Guild Master');
    const advisors = members.filter(m => m.role === 'Guild Advisor');
    const guardians = members.filter(m => m.role === 'Guild Guardian');
    const regularMembers = members.filter(m => 
      !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(m.role)
    );
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Guild Members')
      .setDescription(`Total members: ${members.length}`)
      .setColor('#0099ff')
      .setTimestamp();
    
    if (guildMasters.length > 0) {
      embed.addFields({
        name: 'Guild Masters',
        value: guildMasters.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    if (advisors.length > 0) {
      embed.addFields({
        name: 'Guild Advisors',
        value: advisors.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    if (guardians.length > 0) {
      embed.addFields({
        name: 'Guild Guardians',
        value: guardians.map(m => m.username).join('\n'),
        inline: false
      });
    }
    
    // Regular members (limited to prevent overflow)
    if (regularMembers.length > 0) {
      embed.addFields({
        name: 'Guild Members',
        value: regularMembers.slice(0, 20).map(m => m.username).join('\n') + 
               (regularMembers.length > 20 ? `\n...and ${regularMembers.length - 20} more` : ''),
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching guild members:', error);
    await interaction.editReply('Failed to fetch guild members.');
  }
}

async function verifyEventChannelConfigurations() {
  try {
    console.log(`[INFO] Verifying event channel configurations`);
    
    // Get all guild mappings
    const mappingsResult = await pool.query('SELECT * FROM discord_guild_mappings');
    
    for (const mapping of mappingsResult.rows) {
      const appGuildId = mapping.app_guild_id;
      const discordGuildId = mapping.discord_guild_id;
      
      // Check if this guild has an events channel configured
      const channelConfigResult = await pool.query(
        `SELECT channel_id FROM discord_channel_config 
         WHERE guild_id = $1 AND channel_type = 'events'`,
        [appGuildId]
      );
      
      if (!channelConfigResult.rows.length) {
        console.warn(`[WARN] Guild ${appGuildId} has no events channel configured`);
        
        // Try to find a suitable channel automatically
        try {
          const guild = await client.guilds.fetch(discordGuildId);
          const generalChannel = guild.channels.cache.find(
            c => c.name.includes('general') && c.type === 0
          );
          
          if (generalChannel) {
            console.log(`[INFO] Found potential channel for guild ${appGuildId}: ${generalChannel.name}`);
            
            // Create a message in the general channel to notify admins
            await generalChannel.send({
              content: `⚠️ **Notice to Admins**: This server doesn't have an events channel configured for the bot. Please use the \`/config-channel\` command to set up an events channel so that new events can be posted automatically.`
            });
          }
        } catch (guildError) {
          console.error(`[ERROR] Error checking guild ${discordGuildId}: ${guildError.message}`);
        }
      } else {
        const channelId = channelConfigResult.rows[0].channel_id;
        console.log(`[INFO] Guild ${appGuildId} has events channel: ${channelId}`);
        
        // Verify the channel exists and bot has access
        try {
          const channel = await client.channels.fetch(channelId);
          if (!channel) {
            console.warn(`[WARN] Channel ${channelId} for guild ${appGuildId} not found`);
          } else {
            // Check permissions
            const permissions = channel.permissionsFor(client.user);
            if (!permissions.has('SendMessages') || 
                !permissions.has('EmbedLinks') || 
                !permissions.has('AddReactions')) {
              console.warn(`[WARN] Missing permissions in channel ${channelId} for guild ${appGuildId}`);
              
              // Try to notify in the channel if we can send messages
              if (permissions.has('SendMessages')) {
                await channel.send({
                  content: `⚠️ **Warning**: I don't have all the permissions I need in this channel. Please make sure I have permissions to send messages, embed links, and add reactions.`
                });
              }
            } else {
              console.log(`[INFO] Channel ${channelId} for guild ${appGuildId} is properly configured`);
            }
          }
        } catch (channelError) {
          console.error(`[ERROR] Error checking channel ${channelId}: ${channelError.message}`);
        }
      }
    }
    
    console.log(`[INFO] Event channel verification complete`);
  } catch (error) {
    console.error(`[ERROR] Error verifying channel configurations: ${error.message}`);
  }
}

app.post('/webhook/announce-teams', async (req, res) => {
  try {
    const { guildId, eventId, eventData, teams, secret } = req.body;
    
    console.log(`[INFO] Received announce teams webhook - Guild: ${guildId}, Event: ${eventId}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Define emoji constants
    const tankEmoji = '<:Tank:1352736996405022780>';
    const healerEmoji = '<:Healer:1352737011479482468>';
    const dpsEmoji = '<:DPS:1352737043972624518>';
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.error(`[ERROR] Discord guild mapping not found for guild: ${guildId}`);
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get channel configuration
    const channelConfigResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = 'events' AND enabled = true`,
      [guildId]
    );
    
    if (!channelConfigResult.rows.length) {
      console.error(`[ERROR] No events channel configured for guild: ${guildId}`);
      return res.status(404).json({ error: 'No events channel configured' });
    }
    
    const channelId = channelConfigResult.rows[0].channel_id;
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error(`[ERROR] Channel not found: ${channelId}`);
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    try {
      // Format date and time
      const eventDate = new Date(eventData.event_time);
      const dateFormatted = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timeFormatted = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      // Helper function to get emoji for weapon types
      function getWeaponEmoji(weaponType) {
        if (!weaponType) return '';
        
        const type = String(weaponType).toLowerCase();
        
        const emojiMap = {
          'dagger': '<:Dagger:1352127620761784321>',
          'spear': '<:Spear:1352127656748908636>',
          'wand': '<:Wand:1352127712180830249>',
          'sword and shield': '<:SwordandShield:1352127689183592459>',
          'swordandshield': '<:SwordandShield:1352127689183592459>',
          'sword': '<:SwordandShield:1352127689183592459>',
          'crossbow': '<:Crossbow:1352127594597978112>',
          'greatsword': '<:Greatsword:1352127640227549265>',
          'staff': '<:Staff:1352127671831887923>',
          'bow': '<:Bow:1352127546308825170>'
        };
        
        if (emojiMap[type]) {
          return emojiMap[type];
        }
        
        for (const [key, emoji] of Object.entries(emojiMap)) {
          if (type.includes(key)) {
            return emoji;
          }
        }
        
        return '';
      }
      
      // Create a single embed for the event header and all teams
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${eventData.title} - Team Assignments`)
        .setDescription(
          `📅 **Event:** ${dateFormatted} at ${timeFormatted}\n` +
          `📍 **Location:** ${eventData.location || 'Not specified'}\n\n` +
          (eventData.description ? `${eventData.description}\n\n` : '') +
          `👥 **Total Teams:** ${teams.length}`
        )
        .setColor('#1a64f3')
        .setTimestamp()
        .setFooter({ text: `Use /team view [team_id] for detailed team information` });
      
      // Process teams in groups of 3 for inline display
      // We'll add fields for each team (up to Discord's limit of 25 fields)
      const maxFields = 25;
      
      // First, determine how many teams we can include
      // Each team uses up to 3 fields (one for each team in a row)
      const teamsToInclude = Math.min(teams.length, maxFields);
      
      for (let i = 0; i < teamsToInclude; i += 3) {
        const teamBatch = teams.slice(i, Math.min(i + 3, teamsToInclude));
        
        teamBatch.forEach((team, idx) => {
          // Format members with weapon emojis
          const membersList = team.members.map(member => {
            // Extract weapon emojis and class information from builds
            let weaponEmojis = '';
            let className = '';
            try {
              if (member.builds) {
                const builds = typeof member.builds === 'string' ? 
                  JSON.parse(member.builds) : member.builds;
                  
                if (Array.isArray(builds) && builds.length > 0) {
                  const build = builds[0]; // Use first build
                  if (build.primary) {
                    weaponEmojis += getWeaponEmoji(build.primary);
                  }
                  if (build.secondary) {
                    weaponEmojis += getWeaponEmoji(build.secondary);
                  }
                  // Extract class name
                  className = build.weapon_spec || '';
                }
              }
            } catch (e) {
              console.error(`Error parsing builds for ${member.username}:`, e);
            }
            
            // Include class name in display
            const classDisplay = className ? ` (${className})` : '';
            return `${weaponEmojis} **${member.username || 'Unknown'}**${classDisplay}`;
          }).join('\n');
          
          // Add a field for this team
          embed.addFields({
            name: `Group ${i + idx + 1}: ${team.name}`,
            value: membersList || 'No members assigned',
            inline: true
          });
        });
        
        // Add empty fields to ensure proper 3-column layout if needed
        const emptyFieldsNeeded = 3 - teamBatch.length;
        for (let j = 0; j < emptyFieldsNeeded; j++) {
          embed.addFields({
            name: '\u200B', // Zero-width space
            value: '\u200B',
            inline: true
          });
        }
      }
      
      // Send the single embed with all teams
      await channel.send({ embeds: [embed] });
      
      // If we have more teams than we can fit in one embed, let them know
      if (teams.length > maxFields) {
        await channel.send(`*Note: Only showing ${maxFields} out of ${teams.length} teams due to Discord limitations.*`);
      }
      
      console.log(`[INFO] Team announcements completed successfully for event ${eventId}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`[ERROR] Error sending team announcements: ${error.message}`);
      console.error(error.stack);
      return res.status(500).json({ 
        error: 'Error sending to channel',
        details: error.message
      });
    }
  } catch (error) {
    console.error(`[ERROR] Error processing announce teams webhook: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

app.post('/webhook/update-config', async (req, res) => {
  try {
    const { guildId, discordGuildId, configurations, secret } = req.body;
    
    console.log(`[INFO] Received configuration update for guild: ${guildId}`);
    
    // Validate the secret
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!guildId || !discordGuildId || !configurations) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Store the configurations in the database for persistence
    try {
      // Ensure we have the proper table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS discord_channel_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          discord_guild_id VARCHAR(255) NOT NULL,
          channel_id VARCHAR(255) NOT NULL,
          channel_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Delete existing configurations
      await pool.query(
        `DELETE FROM discord_channel_config WHERE guild_id = $1`,
        [guildId]
      );
      
      // Insert new configurations
      for (const config of configurations) {
        if (config.channel_id && config.channel_type) {
          await pool.query(
            `INSERT INTO discord_channel_config 
             (guild_id, discord_guild_id, channel_id, channel_type, enabled)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              guildId, 
              discordGuildId, 
              config.channel_id, 
              config.channel_type, 
              config.enabled !== false
            ]
          );
        }
      }
      
      console.log(`[INFO] Successfully updated configuration for guild ${guildId}`);
    } catch (dbError) {
      console.error(`[ERROR] Database error when updating configuration:`, dbError);
      // Continue even if DB update fails, as we'll use the in-memory configurations
    }
    
    // Clear any cached configurations for this guild
    const cacheKey = `channel_config_${guildId}`;
    
    // Log the new configuration
    console.log(`[INFO] New channel configuration for guild ${guildId}:`, 
      configurations.map(c => `${c.channel_type}: ${c.channel_id} (${c.enabled ? 'enabled' : 'disabled'})`).join(', ')
    );
    
    // Send success response
    res.json({ success: true });
    
    // Verify the configuration by checking channel validity
    try {
      for (const config of configurations) {
        if (config.enabled && config.channel_id) {
          const channel = await client.channels.fetch(config.channel_id).catch(() => null);
          if (channel) {
            console.log(`[INFO] Verified channel ${config.channel_id} (${channel.name}) for ${config.channel_type}`);
          } else {
            console.warn(`[WARN] Could not find channel ${config.channel_id} for ${config.channel_type}`);
          }
        }
      }
    } catch (verifyError) {
      console.error(`[ERROR] Error verifying channels:`, verifyError);
    }
  } catch (error) {
    console.error(`[ERROR] Error processing update config webhook:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/webhook/channels', async (req, res) => {
  try {
    const { discordGuildId, secret } = req.body;
    
    // Verify secret
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if guild ID is provided
    if (!discordGuildId) {
      return res.status(400).json({ error: 'Discord Guild ID is required' });
    }
    
    // Fetch the guild from Discord API
    try {
      const guild = await client.guilds.fetch(discordGuildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Discord guild not found' });
      }
      
      // Fetch and return all channels
      const channels = await guild.channels.fetch();
      
      // Convert the channels collection to an array and format it
      const channelList = Array.from(channels.values()).map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parent_id: channel.parentId,
        position: channel.position
      }));
      
      console.log(`Returning ${channelList.length} channels for guild ${discordGuildId}`);
      return res.json(channelList);
    } catch (discordError) {
      console.error('Error fetching Discord guild or channels:', discordError);
      return res.status(500).json({ 
        error: 'Failed to fetch Discord channels',
        details: discordError.message
      });
    }
  } catch (error) {
    console.error('Error in /webhook/channels endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/webhook/update-event-signup', async (req, res) => {
  try {
    const { guildId, eventId, userId, username, action, role, secret } = req.body;
    
    console.log(`[INFO] Received event signup update webhook - Event: ${eventId}, User: ${username}, Action: ${action}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Find the Discord message for this event
    const messageResult = await pool.query(
      `SELECT channel_id, message_id FROM discord_event_messages WHERE event_id = $1`,
      [eventId]
    );
    
    if (!messageResult.rows.length) {
      console.log(`[INFO] No Discord message found for event ${eventId} - cannot update signup`);
      return res.json({ success: false, message: 'No Discord message found for this event' });
    }
    
    const { channel_id, message_id } = messageResult.rows[0];
    
    // Get the channel and message
    try {
      const channel = await client.channels.fetch(channel_id);
      
      if (!channel) {
        console.error(`[ERROR] Channel not found: ${channel_id}`);
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const message = await channel.messages.fetch(message_id);
      
      if (!message) {
        console.error(`[ERROR] Message not found: ${message_id}`);
        return res.status(404).json({ error: 'Message not found' });
      }
      
      // Get updated participant data with names
      const participantsResult = await pool.query(
        `SELECT ep.role, u.username, u.discord_id, u.builds
         FROM event_participants ep
         JOIN users u ON ep.user_id = u.id
         WHERE ep.event_id = $1
         ORDER BY ep.created_at ASC`,
        [eventId]
      );
      
      // Get updated absences
      const absenteesResult = await pool.query(
        `SELECT ea.user_id, u.username
         FROM event_absentees ea
         JOIN users u ON ea.user_id = u.id
         WHERE ea.event_id = $1
         ORDER BY ea.created_at ASC`,
        [eventId]
      );
      
      // Group participants by role with FULL USER DATA
      const tanks = participantsResult.rows.filter(p => p.role === 'TANK');
      const healers = participantsResult.rows.filter(p => p.role === 'HEALER');
      const dps = participantsResult.rows.filter(p => p.role === 'DPS');
      const absentees = absenteesResult.rows;
      
      // Get the event details
      const eventResult = await pool.query(
        `SELECT * FROM events WHERE id = $1`,
        [eventId]
      );
      
      if (!eventResult.rows.length) {
        console.error(`[ERROR] Event not found: ${eventId}`);
        return res.status(404).json({ error: 'Event not found' });
      }
      
      const event = eventResult.rows[0];
      
      const eventDate = new Date(event.event_time);
      const dateFormatted = `${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      const timeFormatted = `${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`${event.title || 'Event'}`)
        .setColor('#1a64f3')
        .setDescription(event.description || 'No description provided')
        .addFields(
          {
            name: '⏰ Time',
            value: `📅 ${dateFormatted} ⌚ ${timeFormatted}`,
            inline: false
          },
          {
            name: '📍 Location',
            value: event.location || 'Not specified',
            inline: false
          },
          {
            name: `${tankEmoji} Tanks (${tanks.length}/${event.tanks || 0})`,
            value: tanks.length > 0 ? 
              tanks.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
              '—',
            inline: true
          },
          {
            name: `${healerEmoji} Healers (${healers.length}/${event.healers || 0})`,
            value: healers.length > 0 ? 
              healers.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
              '—',
            inline: true
          },
          {
            name: `${dpsEmoji} DPS (${dps.length}/${event.dps || 0})`,
            value: dps.length > 0 ? 
              dps.map((p, i) => `${i+1}. ${p.username}`).join('\n') : 
              '—',
            inline: true
          },
          {
            name: `❌ Absent (${absentees.length})`,
            value: absentees.length > 0 ? 
              absentees.map((a, i) => `${i+1}. ${a.username}`).join('\n') : 
              '—',
            inline: true
          },
          {
            name: '⏳ Tentative (0)',
            value: '—',
            inline: true
          }
        )
        .setFooter({ text: `Event ID: ${eventId}` });

      await message.edit({ embeds: [updatedEmbed] });
      
      console.log(`[INFO] Updated Discord message with new signup data`);
      res.json({ success: true });
    } catch (error) {
      console.error(`[ERROR] Error updating Discord message:`, error);
      return res.status(500).json({ error: 'Error updating Discord message' });
    }
  } catch (error) {
    console.error(`[ERROR] Error processing event signup update:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

let lastItemPoll = new Date();

const itemRequestMessages = new Map();


client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Create required database tables if they don't exist
  try {
    // Create item tracking table for button interactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_message_tracking (
        id SERIAL PRIMARY KEY,
        item_id UUID NOT NULL,
        guild_id UUID NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        need_count INTEGER DEFAULT 0,
        greed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(item_id)
      )
    `);
    console.log('Item message tracking table verified');
    
    // Create event message tracking table if it doesn't exist already
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS discord_event_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          event_id UUID NOT NULL,
          channel_id VARCHAR(255) NOT NULL,
          message_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(event_id)
        )
      `);
      console.log('Event message tracking table verified');
    } catch (tableError) {
      console.error(`[ERROR] Error creating discord_event_messages table: ${tableError.message}`);
      // Continue even if table creation fails
    }
    
    // Create absentees table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_absentees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          event_id UUID NOT NULL,
          user_id UUID NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(event_id, user_id)
        )
      `);
      console.log('Event absentees table verified');
    } catch (tableError) {
      console.error(`[ERROR] Error creating event_absentees table: ${tableError.message}`);
      // Continue even if table creation fails
    }
    
    // Create channel config table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS discord_channel_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          discord_guild_id VARCHAR(255) NOT NULL,
          channel_id VARCHAR(255) NOT NULL,
          channel_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Channel configuration table verified');
    } catch (tableError) {
      console.error(`[ERROR] Error creating discord_channel_config table: ${tableError.message}`);
      // Continue even if table creation fails
    }
    
    // Recover item tracking after restart
    console.log('Recovering item tracking after restart...');
    await recoverItemTracking();
    
    // Recover event tracking after restart
    console.log('Recovering event tracking after restart...');
    await recoverEventTracking();
    
  } catch (error) {
    console.error('Error setting up database tables:', error);
  }
  
  // Register slash commands
  registerCommands();
  
  // Set up scheduled tasks
  setupScheduledPostings(client);
  
  // Verify channel configurations
  verifyEventChannelConfigurations();
  
  // Start polling for new items with lookback
  console.log('Starting storage item polling...');
  startItemPolling();
  
  // Log bot status
  const guildCount = client.guilds.cache.size;
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  console.log(`----- Bot Status -----`);
  console.log(`Connected to ${guildCount} Discord servers`);
  console.log(`Serving approximately ${totalMembers} users`);
  console.log(`Running in ${process.env.NODE_ENV || 'production'} mode`);
  console.log(`----------------------`);
  
  // Update bot status message
  client.user.setActivity(`/${process.env.COMMAND_PREFIX || 'event'} help`, { type: 'LISTENING' });
});

function startItemPolling() {
  const initialPollTime = new Date();
  initialPollTime.setHours(initialPollTime.getHours() - 1);
  lastItemPoll = initialPollTime;
  console.log(`Initial item poll time set to: ${lastItemPoll.toISOString()}`);
  
  setInterval(async () => {
    try {
      const formattedDate = lastItemPoll.toISOString();
      console.log(`Checking for new items since ${formattedDate}...`);
      
      const newItemsResult = await pool.query(
        `SELECT gsi.*, i.name, i.type, i.icon, g.id as guild_id, dgm.discord_guild_id 
         FROM guild_storage_items gsi
         JOIN items i ON gsi.item_id = i.id
         JOIN guilds g ON gsi.guild_id = g.id
         JOIN discord_guild_mappings dgm ON g.id = dgm.app_guild_id
         WHERE gsi.created_at > $1 OR gsi.updated_at > $1
         ORDER BY gsi.created_at DESC`,
        [formattedDate]
      );
      
      lastItemPoll = new Date();
      
      const newItems = newItemsResult.rows;
      console.log(`Found ${newItems.length} new or updated items.`);
      
      for (const item of newItems) {
        try {
          console.log(`Processing new item: ${item.name} (ID: ${item.id})`);
          
          let timerDisplay = formatTimerDuration(item.timer_duration || 1440);
          try {
            if (item.timer_duration && (item.created_at || item.updated_at)) {
              const timeRemaining = calculateTimeRemaining(item.created_at || item.updated_at, item.timer_duration);
              if (timeRemaining) {
                timerDisplay = timeRemaining;
              }
            }
          } catch (timeError) {
            console.error(`Error calculating time remaining:`, timeError);
          }
          
          const embed = new EmbedBuilder()
            .setTitle('🆕 New Item Added to Storage')
            .setDescription(`Request this item using the buttons below:`)
            .addFields(
              { name: '📦 Item', value: `**${item.name}**`, inline: false },
              { name: 'Type', value: item.type || 'Unknown', inline: true },
              { name: 'Quantity', value: item.quantity.toString() || '0', inline: true },
              { name: 'DKP Cost', value: (item.dkp_cost || 0).toString(), inline: true },
              { 
                name: '⏰ Roll Timer', 
                value: timerDisplay,
                inline: true 
              }
            )
            .setColor('#4CAF50')
            .setTimestamp()
            .setFooter({ text: `Item ID: ${item.id}` });
          
          if (item.trait) {
            embed.addFields({ name: 'Trait', value: item.trait, inline: true });
          }
          
          if (item.icon) {
            embed.setThumbnail(item.icon);
          }
          
          // Create request buttons
          const buttonsRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`need_item_${item.id}`)
              .setLabel('Need Item')
              .setEmoji('1352736996405022780')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`need_trait_${item.id}`)
              .setLabel('Need Trait')
              .setEmoji('✨')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`greed_item_${item.id}`)
              .setLabel('Greed')
              .setEmoji('💰')
              .setStyle(ButtonStyle.Secondary)
          );
          
          const message = await sendNotificationToConfiguredChannel(
            item.guild_id, 
            item.discord_guild_id, 
            'storage', 
            embed,
            null,
            [buttonsRow]  // Changed from 'requestRow' to 'buttonsRow'
          );
          
          if (message) {
            // Create tracking table if needed
            await pool.query(`
              CREATE TABLE IF NOT EXISTS item_message_tracking (
                id SERIAL PRIMARY KEY,
                item_id UUID NOT NULL,
                guild_id UUID NOT NULL,
                channel_id VARCHAR(255) NOT NULL,
                message_id VARCHAR(255) NOT NULL,
                need_count INTEGER DEFAULT 0,
                greed_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(item_id)
              )
            `);
            
            // Store message info
            await pool.query(
              `INSERT INTO item_message_tracking 
               (item_id, guild_id, channel_id, message_id, need_count, greed_count)
               VALUES ($1, $2, $3, $4, 0, 0)
               ON CONFLICT (item_id) DO UPDATE SET
               channel_id = $3, message_id = $4, updated_at = NOW()`,
              [item.id, item.guild_id, message.channelId, message.id]
            );
          }
        } catch (itemError) {
          console.error(`Error processing item ${item.id}:`, itemError);
        }
      }
    } catch (error) {
      console.error('Error in item polling:', error);
    }
  }, 30000);
}

// Initialize bot
client.login(process.env.DISCORD_BOT_TOKEN);