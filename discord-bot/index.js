// discord-bot/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron'); // Added missing import

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
          const eventEmbed = createEventEmbed({
            ...event,
            participants: {
              tank_count: event.tank_count,
              healer_count: event.healer_count, 
              dps_count: event.dps_count
            }
          });
          
          // Add react instructions
          eventEmbed.setDescription(`${event.description || 'No description provided'}\n\n**React to sign up:**\n🛡️ - Tank\n💚 - Healer\n⚔️ - DPS\n❌ - Absent`);
          
          const message = await channel.send({ embeds: [eventEmbed] });
          
          // Add role reactions
          await message.react('🛡️'); // Tank
          await message.react('💚'); // Healer
          await message.react('⚔️'); // DPS
          await message.react('❌'); // Absent
          
          // Set up collector for signups
          const filter = (reaction, user) => ['🛡️', '💚', '⚔️', '❌'].includes(reaction.emoji.name) && !user.bot;
          const collector = message.createReactionCollector({ filter, time: 7 * 24 * 60 * 60 * 1000 });
          
          // Handle reactions
          collector.on('collect', async (reaction, user) => {
            console.log(`[INFO] Reaction collected: ${reaction.emoji.name} from user: ${user.id} (${user.tag})`);
            
            try {
              // Get user from database with more detailed logging
              console.log(`[DEBUG] Looking up user with Discord ID: ${user.id}`);
              const userResult = await pool.query(
                'SELECT id, username FROM users WHERE discord_id = $1',
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
                case '🛡️':
                  role = 'TANK';
                  action = 'signup';
                  break;
                case '💚':
                  role = 'HEALER';
                  action = 'signup';
                  break;
                case '⚔️':
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
                const updatedEmbed = createEventEmbed({
                  ...updatedEvent,
                  participants: {
                    tank_count: updatedEvent.tank_count,
                    healer_count: updatedEvent.healer_count,
                    dps_count: updatedEvent.dps_count
                  }
                });
                
                updatedEmbed.setDescription(`${updatedEvent.description || 'No description provided'}\n\n**React to sign up:**\n🛡️ - Tank\n💚 - Healer\n⚔️ - DPS\n❌ - Absent`);
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
    
    // Create a modern embed with reaction instructions
    const embed = new EmbedBuilder()
      .setTitle('🆕 New Item Added to Storage')
      .setDescription(`**React with a number to request this item:**\n\n1️⃣ - Request 1\n2️⃣ - Request 2\n3️⃣ - Request 3\n4️⃣ - Request 4\n5️⃣ - Request 5`)
      .addFields(
        { name: '📦 Item', value: `**${item.name}**`, inline: false },
        { name: 'Type', value: item.type || 'Unknown', inline: true },
        { name: 'Quantity', value: item.quantity.toString() || '0', inline: true },
        { name: 'DKP Cost', value: (item.dkp_cost || 0).toString(), inline: true }
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
    
    // Send the embed to the configured channel
    const message = await sendNotificationToConfiguredChannel(guildId, discordGuildId, 'storage', embed);
    
    // Add reaction buttons if message was sent successfully
    if (message) {
      try {
        // Add reactions for different quantities
        await message.react('1️⃣'); // Request 1
        await message.react('2️⃣'); // Request 2
        await message.react('3️⃣'); // Request 3
        await message.react('4️⃣'); // Request 4
        await message.react('5️⃣'); // Request 5
        
        // Set up reaction collector
        const filter = (reaction, user) => {
          return ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'].includes(reaction.emoji.name) && !user.bot;
        };
        
        const collector = message.createReactionCollector({ filter, time: 604800000 }); // 7 days
        
        collector.on('collect', async (reaction, user) => {
          try {
            // Determine requested quantity based on reaction
            let quantity = 1;
            switch(reaction.emoji.name) {
              case '2️⃣': quantity = 2; break;
              case '3️⃣': quantity = 3; break;
              case '4️⃣': quantity = 4; break;
              case '5️⃣': quantity = 5; break;
              default: quantity = 1;
            }
            
            // Get user from database
            const userResult = await pool.query(
              'SELECT id, username FROM users WHERE discord_id = $1',
              [user.id]
            );
            
            if (!userResult.rows.length) {
              try {
                await user.send(`You need to register on the website first before requesting items.`);
              } catch (dmError) {
                console.error(`Could not DM user ${user.id}:`, dmError);
              }
              return;
            }
            
            const userId = userResult.rows[0].id;
            
            // Check if item is still available in requested quantity
            const currentItemResult = await pool.query(
              `SELECT quantity FROM guild_storage_items WHERE id = $1`,
              [itemId]
            );
            
            if (!currentItemResult.rows.length || currentItemResult.rows[0].quantity < quantity) {
              try {
                await user.send(`Sorry, "${item.name}" is not available in the requested quantity.`);
              } catch (dmError) {
                console.error(`Could not DM user ${user.id}:`, dmError);
              }
              return;
            }
            
            // Check for existing request
            const existingRequestResult = await pool.query(
              `SELECT id FROM loot_requests 
               WHERE storage_item_id = $1 AND user_id = $2 AND status = 'Pending'`,
              [itemId, userId]
            );
            
            if (existingRequestResult.rows.length) {
              try {
                await user.send(`You already have a pending request for "${item.name}".`);
              } catch (dmError) {
                console.error(`Could not DM user ${user.id}:`, dmError);
              }
              return;
            }
            
            // Create loot request in database
            await pool.query(
              `INSERT INTO loot_requests
               (id, guild_id, storage_item_id, user_id, status, created_at, updated_at)
               VALUES
               (gen_random_uuid(), $1, $2, $3, 'Pending', NOW(), NOW())`,
              [guildId, itemId, userId]
            );
            
            // Send confirmation to user
            try {
              await user.send(`Your request for ${quantity}x "${item.name}" has been submitted!`);
            } catch (dmError) {
              console.error(`Could not DM user ${user.id}:`, dmError);
            }
            
            // Send notification to loot channel
            const requestEmbed = new EmbedBuilder()
              .setTitle('New Loot Request')
              .setDescription(`**${user.username}** has requested **${quantity}x ${item.name}**`)
              .setColor('#9c27b0')
              .setTimestamp()
              .setFooter({ text: `Item ID: ${itemId}` });
            
            await sendNotificationToConfiguredChannel(guildId, discordGuildId, 'loot', requestEmbed);
          } catch (error) {
            console.error('Error processing item request:', error);
            try {
              await user.send(`There was an error processing your request. Please try again later.`);
            } catch (dmError) {
              console.error(`Could not DM user ${user.id}:`, dmError);
            }
          }
        });
      } catch (reactionError) {
        console.error(`Error setting up reactions:`, reactionError);
      }
    }
    
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

    try {
      // Create table to track Discord messages for events
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
    } catch (tableError) {
      console.error(`[ERROR] Error creating discord_event_messages table: ${tableError.message}`);
      // Continue even if table creation fails
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
    console.log(`[INFO] Found Discord guild mapping: ${discordGuildId}`);
    
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
    console.log(`[INFO] Using events channel: ${channelId}`);
    
    // Create absentees table if it doesn't exist
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
    
    // Fetch the newly created event
    const event = await pool.query(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
    
    if (!event.rows.length) {
      console.error(`[ERROR] Event not found: ${eventId}`);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = event.rows[0];
    console.log(`[INFO] Successfully fetched event: ${eventData.title}`);
    
    // Get current participants
    const participantsResult = await pool.query(
      `SELECT ep.role, u.username, u.discord_id 
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
    
    console.log(`[DEBUG] Absences query returned ${absenteesResult.rows.length} rows`);
    
    // Group participants by role
    const participants = {
      TANK: [],
      HEALER: [],
      DPS: []
    };
    
    participantsResult.rows.forEach(p => {
      if (participants[p.role]) {
        participants[p.role].push(p.username);
      }
    });
    
    const absentees = absenteesResult.rows.map(a => a.username);
    
    // Format date
    const eventDate = new Date(eventData.event_time);
    const dateFormatted = `${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    // Format time
    const timeFormatted = `${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    
    // Calculate total signup count
    const totalSignups = participantsResult.rows.length;
    
    // Build event description
    const description = [eventData.description || eventData.title || 'Event'].join('\n\n');
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${eventData.title || 'Event'}`)
      .setColor('#1a64f3') // Raid-Helper blue color
      .setDescription(description)
      .addFields(
        { 
          name: `${totalSignups} (${absentees.length})`, 
          value: `📅 ${dateFormatted} ⏱️ ${timeFormatted}`, 
          inline: false 
        },
        { 
          name: `🛡️ Tank (${participants.TANK.length})`, 
          value: participants.TANK.length > 0 ? 
            participants.TANK.map((name, i) => `${i+1} ${name}`).join('\n') : 
            '—', 
          inline: true 
        },
        { 
          name: `⚔️ Dps (${participants.DPS.length})`, 
          value: participants.DPS.length > 0 ? 
            participants.DPS.map((name, i) => `${i+1} ${name}`).join('\n') : 
            '—', 
          inline: true 
        },
        { 
          name: `💚 Healer (${participants.HEALER.length})`, 
          value: participants.HEALER.length > 0 ? 
            participants.HEALER.map((name, i) => `${i+1} ${name}`).join('\n') : 
            '—', 
          inline: true 
        }
      );
    
    // Add absence section if there are any
    if (absentees.length > 0) {
      embed.addFields({ 
        name: `⛔ Absence (${absentees.length})`, 
        value: absentees.join(', '), 
        inline: false 
      });
    }
    
    // Add footer
    embed.setFooter({ text: `Event ID: ${eventId}` });
    
    try {
      const channel = await client.channels.fetch(channelId);
      
      if (!channel) {
        console.error(`[ERROR] Channel not found: ${channelId}`);
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      console.log(`[INFO] Sending event to channel: ${channel.name}`);
      
      const message = await channel.send({
        content: `**${eventData.title || 'New Event'}**`,
        embeds: [embed]
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
        console.log(`[INFO] Stored Discord message ID ${message.id} for event ${eventId}`);
      } catch (storeError) {
        console.error(`[ERROR] Failed to store Discord message ID: ${storeError.message}`);
        // Continue even if storing fails
      }
      
      console.log(`[INFO] Event message sent successfully`);
      
      // Add role reactions
      await message.react('🛡️'); // Tank
      await message.react('⚔️'); // DPS
      await message.react('💚'); // Healer
      await message.react('⛔'); // Absence
      
      console.log(`[INFO] Added reactions to event message`);
      
      // Set up reaction collector (7 days)
      const filter = (reaction, user) => {
        const validEmojis = ['🛡️', '⚔️', '💚', '⛔'];
        if (!validEmojis.includes(reaction.emoji.name) && !user.bot) {
          // Remove invalid reactions
          reaction.users.remove(user).catch(error => 
            console.error(`Failed to remove invalid reaction: ${error}`)
          );
          return false;
        }
        return validEmojis.includes(reaction.emoji.name) && !user.bot;
      };
      
      const collector = message.createReactionCollector({ filter, time: 604800000 });
      
      collector.on('collect', async (reaction, user) => {
        console.log(`[INFO] Reaction collected: ${reaction.emoji.name} from user: ${user.id}`);
        
        try {
          // Find user in database
          const userResult = await pool.query(
            'SELECT id, username FROM users WHERE discord_id = $1',
            [user.id]
          );
          
          if (!userResult.rows.length) {
            console.log(`[INFO] User not found in database: ${user.id}`);
            try {
              await user.send(`You need to register on Tevent.app before signing up for events.`);
            } catch (dmError) {
              console.log(`[INFO] Could not DM user: ${dmError.message}`);
            }
            return;
          }
          
          const dbUser = userResult.rows[0];
          console.log(`[INFO] Found user: ${dbUser.username} (${dbUser.id})`);
          
          let role, action;
          
          switch(reaction.emoji.name) {
            case '🛡️':
              role = 'TANK';
              action = 'signup';
              break;
            case '⚔️':
              role = 'DPS';
              action = 'signup';
              break;
            case '💚':
              role = 'HEALER';
              action = 'signup';
              break;
            case '⛔':
              action = 'absent';
              break;
          }
          
          if (action === 'signup') {
            console.log(`[INFO] Signing up user ${dbUser.username} as ${role}`);
            
            // Check if already signed up for this event
            const existingSignup = await pool.query(
              'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, dbUser.id]
            );
            
            // If already signed up with same role, do nothing
            if (existingSignup.rows.length && existingSignup.rows[0].role === role) {
              console.log(`[INFO] User already signed up with same role: ${role}`);
              return;
            }
            
            // If signed up with different role, remove existing signup
            if (existingSignup.rows.length) {
              console.log(`[INFO] User changing role from ${existingSignup.rows[0].role} to ${role}`);
              await pool.query(
                'DELETE FROM event_participants WHERE id = $1',
                [existingSignup.rows[0].id]
              );
            }
            
            // Check if role is full
            const roleCounts = await pool.query(
              `SELECT COUNT(*) as count FROM event_participants WHERE event_id = $1 AND role = $2`,
              [eventId, role]
            );
            
            const currentCount = parseInt(roleCounts.rows[0].count);
            const maxCount = {
              'TANK': eventData.tanks,
              'HEALER': eventData.healers,
              'DPS': eventData.dps
            }[role];
            
            if (currentCount >= maxCount) {
              console.log(`[INFO] Role ${role} is full: ${currentCount}/${maxCount}`);
              try {
                await user.send(`The ${role} role is full for event "${eventData.title}".`);
              } catch (dmError) {}
              return;
            }
            
            // Remove from absentees if present
            await pool.query(
              'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
              [eventId, dbUser.id]
            );
            
            // Insert new signup
            await pool.query(
              `INSERT INTO event_participants (id, guild_id, event_id, user_id, role, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
              [guildId, eventId, dbUser.id, role]
            );
            
            console.log(`[INFO] User successfully signed up as ${role}`);
            
            try {
              await user.send(`You've been signed up for "${eventData.title}" as ${role}.`);
            } catch (dmError) {
              console.log(`[INFO] Could not send confirmation DM: ${dmError.message}`);
            }
          } else if (action === 'absent') {
            console.log(`[INFO] Marking user ${dbUser.username} as absent`);
            
            // Remove from participants
            await pool.query(
              'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, dbUser.id]
            );
            
            // Add to absentees
            await pool.query(
              `INSERT INTO event_absentees (id, guild_id, event_id, user_id, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
               ON CONFLICT (event_id, user_id) DO NOTHING`,
              [guildId, eventId, dbUser.id]
            );
            
            console.log(`[INFO] User marked as absent successfully`);
            
            try {
              await user.send(`You've been marked as absent for "${eventData.title}".`);
            } catch (dmError) {
              console.log(`[INFO] Could not send confirmation DM: ${dmError.message}`);
            }
          }
          
          // Now update the embed with the current participants
          const updatedParticipantsResult = await pool.query(
            `SELECT ep.role, u.username, u.discord_id 
             FROM event_participants ep
             JOIN users u ON ep.user_id = u.id
             WHERE ep.event_id = $1
             ORDER BY ep.created_at ASC`,
            [eventId]
          );
          
          // Get updated absences
          const updatedAbsenteesResult = await pool.query(
            `SELECT ea.user_id, u.username
             FROM event_absentees ea
             JOIN users u ON ea.user_id = u.id
             WHERE ea.event_id = $1
             ORDER BY ea.created_at ASC`,
            [eventId]
          );
          
          console.log(`[DEBUG] Updated absences query returned ${updatedAbsenteesResult.rows.length} rows`);
          
          // Group participants by role
          const updatedParticipants = {
            TANK: [],
            HEALER: [],
            DPS: []
          };
          
          updatedParticipantsResult.rows.forEach(p => {
            if (updatedParticipants[p.role]) {
              updatedParticipants[p.role].push(p.username);
            }
          });
          
          const updatedAbsentees = updatedAbsenteesResult.rows.map(a => a.username);
          
          console.log(`[INFO] Updated participants - Tanks: ${updatedParticipants.TANK.length}, Healers: ${updatedParticipants.HEALER.length}, DPS: ${updatedParticipants.DPS.length}, Absences: ${updatedAbsentees.length}`);
          
          // Calculate new total signup count
          const updatedTotalSignups = updatedParticipantsResult.rows.length;
          
          // Create updated embed
          const updatedEmbed = new EmbedBuilder()
            .setTitle(`${eventData.title || 'Event'}`)
            .setColor('#1a64f3') // Raid-Helper blue color
            .setDescription(description)
            .addFields(
              { 
                name: `${updatedTotalSignups} (${updatedAbsentees.length})`, 
                value: `📅 ${dateFormatted} ⏱️ ${timeFormatted}`, 
                inline: false 
              },
              { 
                name: `🛡️ Tank (${updatedParticipants.TANK.length})`, 
                value: updatedParticipants.TANK.length > 0 ? 
                  updatedParticipants.TANK.map((name, i) => `${i+1} ${name}`).join('\n') : 
                  '—', 
                inline: true 
              },
              { 
                name: `⚔️ Dps (${updatedParticipants.DPS.length})`, 
                value: updatedParticipants.DPS.length > 0 ? 
                  updatedParticipants.DPS.map((name, i) => `${i+1} ${name}`).join('\n') : 
                  '—', 
                inline: true 
              },
              { 
                name: `💚 Healer (${updatedParticipants.HEALER.length})`, 
                value: updatedParticipants.HEALER.length > 0 ? 
                  updatedParticipants.HEALER.map((name, i) => `${i+1} ${name}`).join('\n') : 
                  '—', 
                inline: true 
              }
            );
          
          // Add absence section if there are any
          if (updatedAbsentees.length > 0) {
            updatedEmbed.addFields({ 
              name: `⛔ Absence (${updatedAbsentees.length})`, 
              value: updatedAbsentees.join(', '), 
              inline: false 
            });
          }
          
          // Add footer
          updatedEmbed.setFooter({ text: `Event ID: ${eventId}` });
          
          await message.edit({ embeds: [updatedEmbed] });
          console.log(`[INFO] Updated event message with current participants`);
          
        } catch (error) {
          console.error(`[ERROR] Error processing reaction:`, error);
        }
      });
      
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
    if (!appGuildId) return; // Skip if no mapping exists
    
    // Login to get session cookie
    const loginResponse = await axios.post(`${API_URL}/api/auth/bot-login`, {
      botSecret: process.env.DISCORD_CLIENT_SECRET
    });
    
    if (!loginResponse.data.success) {
      console.error('Bot login failed');
      return;
    }
    
    const cookies = loginResponse.headers['set-cookie'];
    
    // Add the user to the application guild
    await axios.post(`${API_URL}/api/users`, {
      discordId: member.id,
      username: member.user.username,
      role: 'Guild Member',
      guildId: appGuildId
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log(`User ${member.user.username} added to guild ${appGuildId}!`);
  } catch (error) {
    console.error('Error adding new user:', error);
  }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'setup_wizard') {
    // Respond with the setup link
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
});

// Register slash commands
const registerCommands = async () => {
  try {
    // Commands structure
    const commands = [
      // Link command - only for server admins
      {
        name: 'link-guild',
        description: 'Link this Discord server to your application guild',
        options: []
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
    // Handle different interaction types
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
        await interaction.deferReply();
        
        try {
          console.log(`Running connection check for Discord guild: ${discordGuildId}`);
          
          // First try direct database check
          if (appGuildId) {
            // Check if guild exists
            const guildResult = await pool.query(
              'SELECT id, name, created_at FROM guilds WHERE id = $1',
              [appGuildId]
            );
            
            if (guildResult.rows && guildResult.rows.length > 0) {
              const guild = guildResult.rows[0];
              const createdDate = new Date(guild.created_at).toLocaleDateString();
              
              // Count members
              const memberCountResult = await pool.query(
                'SELECT COUNT(*) as count FROM guild_members WHERE guild_id = $1',
                [appGuildId]
              );
              
              const memberCount = memberCountResult.rows[0].count;
              
              await interaction.editReply({
                content: `✅ **Connection Success!**\n\nDiscord Server: \`${interaction.guild.name}\`\nLinked Guild: \`${guild.name}\`\nGuild ID: \`${appGuildId}\`\nCreated: ${createdDate}\nMembers: ${memberCount}`
              });
            } else {
              await interaction.editReply({
                content: `⚠️ **Partial Connection**\n\nThis Discord server is mapped to guild ID \`${appGuildId}\`, but that guild no longer exists in the database.`
              });
            }
          } else {
            await interaction.editReply({
              content: `❌ **Not Connected**\nThis Discord server (ID: ${discordGuildId}) is not connected to any guild yet.\n\nAn admin needs to complete the connection setup using \`/setup\`.`
            });
          }
        } catch (error) {
          console.error('Check connection error:', error);
          await interaction.editReply(`❌ **Error Checking Connection**\n${error.message}`);
        }
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      const customId = interaction.customId;
      
      // Handle setup wizard button
      if (customId === 'setup_wizard') {
        // Respond with the setup link
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
        return;
      }
      
      // Handle loot approval/denial buttons
      if (customId.startsWith('approve_loot_') || customId.startsWith('deny_loot_')) {
        const requestId = customId.replace(/^(approve_loot_|deny_loot_)/, '');
        const isApprove = customId.startsWith('approve_loot_');
        
        // Check guild mapping first
        const discordGuildId = interaction.guild?.id;
        if (!discordGuildId) {
          return await interaction.reply({
            content: 'This button must be used in a Discord server.',
            ephemeral: true
          });
        }
        
        const appGuildId = await getGuildMapping(discordGuildId);
        if (!appGuildId) {
          return await interaction.reply({
            content: 'This Discord server is not linked to an application guild.',
            ephemeral: true
          });
        }
        
        await interaction.deferReply();
        
        try {
          // Get request details first
          const requestResult = await pool.query(
            `SELECT lr.*, 
                  gsi.quantity, 
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
          
          if (isApprove) {
            // Check if item is still available
            if (request.quantity < 1) {
              return await interaction.editReply('Item is no longer available in storage.');
            }
            
            // Update request and decrement quantity in a transaction
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              
              // Update request status for the current request
              await client.query(
                `UPDATE loot_requests 
                SET status = 'Approved', updated_at = NOW()
                WHERE id = $1`,
                [requestId]
              );
              
              // Get current quantity
              const quantityResult = await client.query(
                `SELECT quantity FROM guild_storage_items WHERE id = $1`,
                [request.storage_item_id]
              );
              
              if (!quantityResult.rows.length || quantityResult.rows[0].quantity <= 0) {
                await client.query('ROLLBACK');
                return await interaction.editReply('Item is no longer available in storage.');
              }
              
              const newQuantity = quantityResult.rows[0].quantity - 1;
              
              // If quantity will reach zero, handle deletion and related requests
              if (newQuantity === 0) {
                // First update all other pending requests to "Denied - Out of Stock"
                await client.query(
                  `UPDATE loot_requests 
                  SET status = 'Denied - Out of Stock' 
                  WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
                  [request.storage_item_id, requestId]
                );
                
                // IMPORTANT: Clear foreign key references from loot_requests
                // This is crucial to avoid FK constraint violations
                await client.query(
                  `UPDATE loot_requests 
                  SET storage_item_id = NULL 
                  WHERE storage_item_id = $1`,
                  [request.storage_item_id]
                );
                
                // Now it's safe to delete the item
                await client.query(
                  `DELETE FROM guild_storage_items WHERE id = $1`,
                  [request.storage_item_id]
                );
                
                console.log(`Deleted storage item ${request.storage_item_id} (quantity reached 0)`);
              } else {
                // Just decrement quantity
                await client.query(
                  `UPDATE guild_storage_items
                  SET quantity = quantity - 1, updated_at = NOW()
                  WHERE id = $1`,
                  [request.storage_item_id]
                );
              }
              
              await client.query('COMMIT');
            } catch (error) {
              await client.query('ROLLBACK');
              throw error;
            } finally {
              client.release();
            }
            
            // Send notification to user if possible
            if (request.discord_id) {
              try {
                const user = await interaction.client.users.fetch(request.discord_id);
                await user.send(`✅ Your request for **${request.item_name}** has been approved!`);
              } catch (dmError) {
                console.error(`Failed to DM user: ${dmError.message}`);
              }
            }
            
            await interaction.editReply({
              content: `✅ Loot request approved successfully. **${request.item_name}** will be given to **${request.username}**.`
            });
          } else {
            // Deny request
            await pool.query(
              `UPDATE loot_requests 
              SET status = 'Denied', updated_at = NOW()
              WHERE id = $1`,
              [requestId]
            );
            
            // Send notification to user if possible
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
          }
        } catch (error) {
          console.error(`Error processing loot request:`, error);
          await interaction.editReply(`Failed to process loot request: ${error.message}`);
        }
      }
      
      // Handle event signup buttons
      if (customId.startsWith('signup_')) {
        const [_, eventId, role] = customId.split('_');
        
        // Check guild mapping first
        const discordGuildId = interaction.guild?.id;
        if (!discordGuildId) {
          return await interaction.reply({
            content: 'This button must be used in a Discord server.',
            ephemeral: true
          });
        }
        
        const appGuildId = await getGuildMapping(discordGuildId);
        if (!appGuildId) {
          return await interaction.reply({
            content: 'This Discord server is not linked to an application guild.',
            ephemeral: true
          });
        }
        
        // Create a fake interaction options object to reuse the signup handler
        interaction.options = {
          getString: (name) => {
            if (name === 'event_id') return eventId;
            if (name === 'role') return role;
            return null;
          }
        };
        
        await handleEventSignupCommand(interaction, appGuildId);
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

// Link guild command handler
async function handleLinkGuildCommand(interaction) {
  // Only server admins can use this command
  if (!interaction.member.permissions.has('Administrator')) {
    return await interaction.reply({ 
      content: 'Only server administrators can link guilds.', 
      ephemeral: true 
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  // Generate a web setup URL instead of requiring manual parameters
  const setupUrl = `${process.env.FRONTEND_URL}/discord/setup?guildId=${interaction.guild.id}`;
  
  await interaction.editReply({
    content: `Click the link below to connect this Discord server to your guild:`,
    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setURL(setupUrl)
            .setLabel('Setup Connection')
            .setStyle(ButtonStyle.Link)
        )
    ]
  });
}

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
    
    // If specific event ID is requested, add reactions for role signups
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
      const embed = createEventEmbed({
        ...event,
        participants: {
          tank_count: event.tank_count,
          healer_count: event.healer_count,
          dps_count: event.dps_count
        }
      });
      
      // Add instruction for reaction signups
      embed.setDescription(`${event.description || 'No description provided'}\n\n**React to sign up:**\n🛡️ - Tank\n💚 - Healer\n⚔️ - DPS\n❌ - Absent`);
      
      // Send message with reaction options
      const message = await interaction.editReply({ 
        embeds: [embed],
        fetchReply: true
      });
      
      // Add role reactions
      await message.react('🛡️'); // Tank
      await message.react('💚'); // Healer
      await message.react('⚔️'); // DPS
      await message.react('❌'); // Absent
      
      // Set up reaction collector (24 hour timeout)
      const filter = (reaction, user) => {
        return ['🛡️', '💚', '⚔️', '❌'].includes(reaction.emoji.name) && !user.bot;
      };
      
      const collector = message.createReactionCollector({ filter, time: 86400000 });
      
      collector.on('collect', async (reaction, user) => {
        try {
          // Get user from database
          const userResult = await pool.query(
            'SELECT id, username FROM users WHERE discord_id = $1',
            [user.id]
          );
          
          if (!userResult.rows.length) {
            // DM the user that they need to register
            try {
              await user.send(`You need to register on the website first before signing up for events.`);
            } catch (dmError) {
              console.error(`Could not DM user ${user.id}:`, dmError);
            }
            return;
          }
          
          const dbUser = userResult.rows[0];
          let role, action;
          
          switch(reaction.emoji.name) {
            case '🛡️':
              role = 'TANK';
              action = 'signup';
              break;
            case '💚':
              role = 'HEALER';
              action = 'signup';
              break;
            case '⚔️':
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
            
            if (existingSignupResult.rows.length) {
              // Update role
              await pool.query(
                'UPDATE event_participants SET role = $1 WHERE id = $2',
                [role, existingSignupResult.rows[0].id]
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
                  SUM(CASE WHEN role = 'TANK' THEN 1 ELSE 0 END) as tank_count,
                  SUM(CASE WHEN role = 'HEALER' THEN 1 ELSE 0 END) as healer_count,
                  SUM(CASE WHEN role = 'DPS' THEN 1 ELSE 0 END) as dps_count
                FROM event_participants
                WHERE event_id = $1`,
                [eventId]
              );
              
              const roleCounts = roleCountsResult.rows[0];
              const currentCounts = {
                'TANK': parseInt(roleCounts?.tank_count || 0),
                'HEALER': parseInt(roleCounts?.healer_count || 0),
                'DPS': parseInt(roleCounts?.dps_count || 0)
              };
              
              if (currentCounts[role] >= roleLimits[role]) {
                try {
                  await user.send(`Sorry, the ${role} spots are full for "${event.title}".`);
                } catch (dmError) {}
                return;
              }
              
              // Create new signup
              await pool.query(
                `INSERT INTO event_participants 
                  (id, guild_id, event_id, user_id, role, created_at, updated_at)
                VALUES
                  (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
                [appGuildId, eventId, dbUser.id, role]
              );
              
              try {
                await user.send(`You've been signed up for "${event.title}" as ${role}.`);
              } catch (dmError) {}
              
              // Post to event channel
              await sendNotificationToConfiguredChannel(
                appGuildId, 
                interaction.guild.id, 
                'events', 
                new EmbedBuilder()
                  .setTitle('Event Signup')
                  .setDescription(`**${user.username}** has signed up for **${event.title}** as **${role}**`)
                  .setColor('#00FF00')
                  .setTimestamp()
              );
            }
          } else if (action === 'absent') {
            // Mark as absent
            // First delete any existing signup
            await pool.query(
              'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, dbUser.id]
            );
            
            // Then add to absentees (if table exists)
            try {
              await pool.query(
                `INSERT INTO event_absentees
                 (id, guild_id, event_id, user_id, created_at, updated_at)
                 VALUES
                 (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                 ON CONFLICT (event_id, user_id) DO NOTHING`,
                [appGuildId, eventId, dbUser.id]
              );
            } catch (insertError) {
              // Table might not exist - try to create it
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
                
                // Try insert again
                await pool.query(
                  `INSERT INTO event_absentees
                   (id, guild_id, event_id, user_id, created_at, updated_at)
                   VALUES
                   (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
                  [appGuildId, eventId, dbUser.id]
                );
              } catch (tableError) {
                console.error('Error creating absentees table:', tableError);
              }
            }
            
            try {
              await user.send(`You've been marked as absent for "${event.title}".`);
            } catch (dmError) {}
          }
          
          // Update the embed with new counts
          const updatedEventResult = await pool.query(
            `SELECT e.*, 
                   (SELECT COUNT(*) FROM event_participants ep 
                    WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
                   (SELECT COUNT(*) FROM event_participants ep 
                    WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
                   (SELECT COUNT(*) FROM event_participants ep 
                    WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count,
                   (SELECT COUNT(*) FROM event_absentees ea
                    WHERE ea.event_id = e.id) as absent_count
            FROM events e
            WHERE e.id = $1`,
            [eventId]
          );
          
          if (updatedEventResult.rows.length) {
            const updatedEvent = updatedEventResult.rows[0];
            const updatedEmbed = createEventEmbed({
              ...updatedEvent,
              participants: {
                tank_count: updatedEvent.tank_count,
                healer_count: updatedEvent.healer_count,
                dps_count: updatedEvent.dps_count
              }
            });
            
            updatedEmbed.setDescription(`${updatedEvent.description || 'No description provided'}\n\n**React to sign up:**\n🛡️ - Tank\n💚 - Healer\n⚔️ - DPS\n❌ - Absent`);
            
            await message.edit({ embeds: [updatedEmbed] });
          }
        } catch (error) {
          console.error('Error processing role signup reaction:', error);
        }
      });
      
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
    const embeds = events.map(event => createEventEmbed({
      ...event,
      participants: {
        tank_count: event.tank_count,
        healer_count: event.healer_count,
        dps_count: event.dps_count
      }
    }));
    
    await interaction.editReply({ 
      content: 'Upcoming events: (Use /events with an event ID to sign up with reactions)',
      embeds: embeds
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    await interaction.editReply('Failed to fetch events.');
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
    
    // Get channel configuration
    const configResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = $2 AND enabled = true`,
      [guildId, type]
    );
    
    // If no channel is configured for this type, try to find a general channel
    if (!configResult.rows.length) {
      console.log(`[INFO] No ${type} channel configured, checking for general channel`);
      
      const generalResult = await pool.query(
        `SELECT channel_id FROM discord_channel_config 
         WHERE guild_id = $1 AND channel_type = 'general' AND enabled = true`,
        [guildId]
      );
      
      if (!generalResult.rows.length) {
        console.log(`[INFO] No general channel configured, trying to find any channel`);
        
        // If no general channel either, try the first configured channel of any type
        const anyChannelResult = await pool.query(
          `SELECT channel_id FROM discord_channel_config 
           WHERE guild_id = $1 AND enabled = true
           LIMIT 1`,
          [guildId]
        );
        
        if (!anyChannelResult.rows.length) {
          console.log(`[INFO] No channels configured at all for guild ${guildId}`);
          
          // Last resort: try to find a system channel in the Discord guild
          try {
            const guild = await client.guilds.fetch(discordGuildId);
            if (guild && guild.systemChannel) {
              console.log(`[INFO] Using system channel ${guild.systemChannel.id}`);
              const message = await guild.systemChannel.send({
                content: content || '',
                embeds: [embed],
                components: components
              });
              return message;
            }
          } catch (discordError) {
            console.error(`[ERROR] Could not fetch Discord guild:`, discordError);
          }
          
          return false; // No channel configured or found
        }
        
        const channelId = anyChannelResult.rows[0].channel_id;
        console.log(`[INFO] Using fallback channel: ${channelId}`);
        
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          console.error(`[ERROR] Fallback channel ${channelId} not found`);
          return false;
        }
        
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
    console.log(`[INFO] Sending message to channel ${channelId}`);
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
    
    // Check if event exists
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, appGuildId]
    );
    
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return await interaction.editReply(`Event with ID ${eventId} not found.`);
    }
    
    const event = eventResult.rows[0];
    
    // Get user ID from discord ID
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE discord_id = $1',
      [discordUserId]
    );
    
    if (!userResult.rows || userResult.rows.length === 0) {
      return await interaction.editReply('Your user account was not found. Please log in to the website first.');
    }
    
    const user = userResult.rows[0];
    
    // Check if already signed up
    const existingSignupResult = await pool.query(
      'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2 AND guild_id = $3',
      [eventId, user.id, appGuildId]
    );
    
    if (existingSignupResult.rows && existingSignupResult.rows.length > 0) {
      const existingSignup = existingSignupResult.rows[0];
      
      // Update existing signup
      await pool.query(
        'UPDATE event_participants SET role = $1 WHERE id = $2',
        [role, existingSignup.id]
      );
      
      return await interaction.editReply(`You've updated your role for "${event.title}" to ${role}.`);
    }
    
    // Check role capacity
    const roleCountsResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN role = 'TANK' THEN 1 ELSE 0 END) as tank_count,
        SUM(CASE WHEN role = 'HEALER' THEN 1 ELSE 0 END) as healer_count,
        SUM(CASE WHEN role = 'DPS' THEN 1 ELSE 0 END) as dps_count
      FROM event_participants
      WHERE event_id = $1`,
      [eventId]
    );
    
    const roleCounts = roleCountsResult.rows[0];
    
    // Verify there's room for this role
    const roleLimits = {
      'TANK': event.tanks || 0,
      'HEALER': event.healers || 0,
      'DPS': event.dps || 0
    };
    
    const currentCounts = {
      'TANK': parseInt(roleCounts?.tank_count || 0),
      'HEALER': parseInt(roleCounts?.healer_count || 0),
      'DPS': parseInt(roleCounts?.dps_count || 0)
    };
    
    if (currentCounts[role] >= roleLimits[role]) {
      return await interaction.editReply(`Sorry, the ${role} spots are full for this event.`);
    }
    
    // Create new signup
    await pool.query(
      `INSERT INTO event_participants 
        (id, guild_id, event_id, user_id, role, created_at, updated_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
      [appGuildId, eventId, user.id, role]
    );
    
    await interaction.editReply(`You've been signed up for "${event.title}" as ${role}.`);
    
    // Post a public confirmation
    try {
      const confirmEmbed = new EmbedBuilder()
        .setTitle('New Event Signup')
        .setDescription(`${interaction.user.username} has signed up for "${event.title}" as ${role}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.followUp({
        embeds: [confirmEmbed],
        ephemeral: false
      });
    } catch (followupError) {
      console.error('Error sending signup confirmation:', followupError);
    }
  } catch (error) {
    console.error('Error signing up for event:', error);
    await interaction.editReply('Failed to sign up for the event.');
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

function createEventEmbed(event) {
  // Format date
  const eventDate = new Date(event.event_time);
  const dateFormatted = `${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  
  // Format time
  const timeFormatted = `${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  
  // Get participant counts
  const tankCount = parseInt(event.tank_count || event.participants?.tank_count || 0);
  const healerCount = parseInt(event.healer_count || event.participants?.healer_count || 0);
  const dpsCount = parseInt(event.dps_count || event.participants?.dps_count || 0);
  const totalSignups = tankCount + healerCount + dpsCount;
  const absentCount = parseInt(event.absent_count || 0);
  
  const embed = new EmbedBuilder()
    .setTitle(`${event.title || 'Event'}`)
    .setColor('#1a64f3') // Raid-Helper blue color
    .setDescription(event.description || 'No description provided')
    .addFields(
      { 
        name: `${totalSignups} (${absentCount})`, 
        value: `📅 ${dateFormatted} ⏱️ ${timeFormatted}`, 
        inline: false 
      }
    );
    
  // Add role fields with numbered participants
  let tankValue = '—';
  let dpsValue = '—';
  let healerValue = '—';
  
  // We'd normally populate these with actual participant names from the database
  // This is a placeholder for the embed structure
  if (event.participants) {
    const tankParticipants = event.participants.filter(p => p.role === 'TANK').map(p => p.User.username);
    const dpsParticipants = event.participants.filter(p => p.role === 'DPS').map(p => p.User.username);
    const healerParticipants = event.participants.filter(p => p.role === 'HEALER').map(p => p.User.username);
    
    if (tankParticipants.length > 0) {
      tankValue = tankParticipants.map((name, i) => `${i+1} ${name}`).join('\n');
    }
    
    if (dpsParticipants.length > 0) {
      dpsValue = dpsParticipants.map((name, i) => `${i+1} ${name}`).join('\n');
    }
    
    if (healerParticipants.length > 0) {
      healerValue = healerParticipants.map((name, i) => `${i+1} ${name}`).join('\n');
    }
  }
  
  embed.addFields(
    { 
      name: `🛡️ Tank (${tankCount})`, 
      value: tankValue, 
      inline: true 
    },
    { 
      name: `⚔️ Dps (${dpsCount})`, 
      value: dpsValue, 
      inline: true 
    },
    { 
      name: `💚 Healer (${healerCount})`, 
      value: healerValue, 
      inline: true 
    }
  );
  
  // Add absence section if there are any absentees
  if (event.absentees && event.absentees.length > 0) {
    embed.addFields({ 
      name: `⛔ Absence (${event.absentees.length})`, 
      value: event.absentees.map(a => a.User.username).join(', '), 
      inline: false 
    });
  }
  
  embed.setFooter({ text: `Event ID: ${event.id}` });
  
  return embed;
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
    
    // Get Discord guild ID from app guild ID
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.error(`[ERROR] Discord guild mapping not found for guild: ${guildId}`);
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    console.log(`[INFO] Found Discord guild mapping: ${discordGuildId}`);
    
    // Get the channel configuration for events
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
    console.log(`[INFO] Using channel ID: ${channelId}`);
    
    // Verify the channel exists and the bot has access
    let channel;
    try {
      channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`[ERROR] Channel not found: ${channelId}`);
        return res.status(404).json({ error: 'Channel not found' });
      }
      console.log(`[INFO] Successfully fetched channel: ${channel.name}`);
    } catch (channelError) {
      console.error(`[ERROR] Failed to fetch channel: ${channelError.message}`);
      return res.status(500).json({ 
        error: 'Failed to fetch channel',
        details: channelError.message
      });
    }
    
    // Verify permissions
    try {
      const permissions = channel.permissionsFor(client.user);
      if (!permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
        console.error(`[ERROR] Bot lacks permissions in channel ${channelId}`);
        return res.status(403).json({ 
          error: 'Permission denied',
          details: 'Bot requires SendMessages and EmbedLinks permissions'
        });
      }
    } catch (permError) {
      console.error(`[ERROR] Error checking permissions: ${permError.message}`);
    }
    
    try {
      // Format date and time
      const eventDate = new Date(eventData.event_time);
      const dateFormatted = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timeFormatted = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      // Create a single embed for all teams
      const mainEmbed = new EmbedBuilder()
        .setTitle(`${eventData.title} - Team Assignments`)
        .setDescription(`**Event Time**: 📅 ${dateFormatted} at ${timeFormatted}\n**Location**: ${eventData.location || 'Not specified'}\n\n${eventData.description || ''}`)
        .setColor('#1a64f3')
        .setTimestamp()
        .setFooter({ text: `Boonstone + Interserver + Open World PvP` });
      
      console.log(`[INFO] Processing ${teams.length} teams...`);
      
      // Discord has a limit of 25 fields per embed
      const MAX_FIELDS = 25;
      const needsMultipleEmbeds = teams.length > MAX_FIELDS;
      
      // If we need multiple embeds, adjust our approach
      if (needsMultipleEmbeds) {
        console.log(`[INFO] Too many teams (${teams.length}) for a single embed, splitting into multiple messages`);
        
        // Send the header embed first
        await channel.send({ embeds: [mainEmbed] });
        
        // Process teams in batches
        for (let i = 0; i < teams.length; i += MAX_FIELDS) {
          const teamBatch = teams.slice(i, i + MAX_FIELDS);
          const batchEmbed = new EmbedBuilder()
            .setTitle(`${eventData.title} - Teams (continued)`)
            .setColor('#1a64f3');
          
          // Add each team as a field
          for (let j = 0; j < teamBatch.length; j++) {
            const team = teamBatch[j];
            const groupNumber = i + j + 1;
            
            // Group members by role with nice formatting
            const tanks = team.members.filter(m => m.role?.toUpperCase() === 'TANK');
            const healers = team.members.filter(m => m.role?.toUpperCase() === 'HEALER');
            const dps = team.members.filter(m => m.role?.toUpperCase() === 'DPS');
            
            let teamText = '';
            
            if (tanks.length > 0) {
              teamText += `🛡️ **Tanks**: ${tanks.map(m => m.username).join(', ')}\n`;
            }
            
            if (healers.length > 0) {
              teamText += `💚 **Healers**: ${healers.map(m => m.username).join(', ')}\n`;
            }
            
            if (dps.length > 0) {
              teamText += `⚔️ **DPS**: ${dps.map(m => m.username).join(', ')}`;
            }
            
            batchEmbed.addFields({
              name: `${team.name}`,
              value: teamText || 'No members assigned',
              inline: false
            });
          }
          
          await channel.send({ embeds: [batchEmbed] });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        // All teams can fit in a single embed
        // Add each team as a field
        teams.forEach((team, index) => {
          const groupNumber = index + 1;
          
          // Group members by role with nice formatting
          const tanks = team.members.filter(m => m.role?.toUpperCase() === 'TANK');
          const healers = team.members.filter(m => m.role?.toUpperCase() === 'HEALER');
          const dps = team.members.filter(m => m.role?.toUpperCase() === 'DPS');
          
          let teamText = '';
          
          if (tanks.length > 0) {
            teamText += `🛡️ **Tanks**: ${tanks.map(m => m.username).join(', ')}\n`;
          }
          
          if (healers.length > 0) {
            teamText += `💚 **Healers**: ${healers.map(m => m.username).join(', ')}\n`;
          }
          
          if (dps.length > 0) {
            teamText += `⚔️ **DPS**: ${dps.map(m => m.username).join(', ')}`;
          }
          
          mainEmbed.addFields({
            name: `Group ${groupNumber}: ${team.name}`,
            value: teamText || 'No members assigned',
            inline: false
          });
        });
        
        // Send the embed with all teams
        await channel.send({ embeds: [mainEmbed] });
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
      
      // Get updated participant counts to refresh the embed
      const participantsResult = await pool.query(
        `SELECT ep.role, u.username, u.discord_id 
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
      
      // Group participants by role
      const participants = {
        TANK: [],
        HEALER: [],
        DPS: []
      };
      
      participantsResult.rows.forEach(p => {
        if (participants[p.role]) {
          participants[p.role].push(p.username);
        }
      });
      
      const absentees = absenteesResult.rows.map(a => a.username);
      
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
      
      // Format date and time
      const eventDate = new Date(event.event_time);
      const dateFormatted = `${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      const timeFormatted = `${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      
      // Calculate total signup count
      const totalSignups = Object.values(participants).reduce((sum, list) => sum + list.length, 0);
      
      // Create updated embed
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`${event.title || 'Event'}`)
        .setColor('#1a64f3')
        .setDescription(event.description || 'No description provided')
        .addFields(
          { 
            name: `${totalSignups} (${absentees.length})`, 
            value: `📅 ${dateFormatted} ⏱️ ${timeFormatted}`, 
            inline: false 
          },
          { 
            name: `🛡️ Tank (${participants.TANK.length})`, 
            value: participants.TANK.length > 0 ? 
              participants.TANK.map((name, i) => `${i+1} ${name}`).join('\n') : 
              '—', 
            inline: true 
          },
          { 
            name: `⚔️ Dps (${participants.DPS.length})`, 
            value: participants.DPS.length > 0 ? 
              participants.DPS.map((name, i) => `${i+1} ${name}`).join('\n') : 
              '—', 
            inline: true 
          },
          { 
            name: `💚 Healer (${participants.HEALER.length})`, 
            value: participants.HEALER.length > 0 ? 
              participants.HEALER.map((name, i) => `${i+1} ${name}`).join('\n') : 
              '—', 
            inline: true 
          }
        );
      
      // Add absence section if there are any
      if (absentees.length > 0) {
        updatedEmbed.addFields({ 
          name: `⛔ Absence (${absentees.length})`, 
          value: absentees.join(', '), 
          inline: false 
        });
      }
      
      // Add footer
      updatedEmbed.setFooter({ text: `Event ID: ${eventId}` });
      
      // Update the embed
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


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
  setupScheduledPostings(client);
  verifyEventChannelConfigurations();
  
  console.log('Starting storage item polling...');
  startItemPolling();
});

function startItemPolling() {
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
          
          const embed = new EmbedBuilder()
            .setTitle('🆕 New Item Added to Storage')
            .setDescription(`**React to request this item:**\n\n❗ - Need (High Priority)\n💰 - Greed (Low Priority)`)
            .addFields(
              { name: '📦 Item', value: `**${item.name}**`, inline: false },
              { name: 'Type', value: item.type || 'Unknown', inline: true },
              { name: 'Quantity', value: item.quantity.toString() || '0', inline: true },
              { name: 'DKP Cost', value: (item.dkp_cost || 0).toString(), inline: true }
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
          
          const message = await sendNotificationToConfiguredChannel(
            item.guild_id, 
            item.discord_guild_id, 
            'storage', 
            embed
          );
          
          if (message) {
            await message.react('❗');
            await message.react('💰');
            
            const filter = (reaction, user) => {
              return ['❗', '💰'].includes(reaction.emoji.name) && !user.bot;
            };
            
            const collector = message.createReactionCollector({ filter, time: 604800000 }); // 7 days
            
            collector.on('collect', async (reaction, user) => {
              try {
                const priority = reaction.emoji.name === '❗' ? 'Need' : 'Greed';
                
                const userResult = await pool.query(
                  'SELECT id, username FROM users WHERE discord_id = $1',
                  [user.id]
                );
                
                if (!userResult.rows.length) {
                  try {
                    await user.send(`You need to register on the website first before requesting items.`);
                  } catch (dmError) {
                    console.error(`Could not DM user ${user.id}:`, dmError);
                  }
                  return;
                }
                
                const userId = userResult.rows[0].id;
                
                const currentItemResult = await pool.query(
                  `SELECT quantity FROM guild_storage_items WHERE id = $1`,
                  [item.id]
                );
                
                if (!currentItemResult.rows.length || currentItemResult.rows[0].quantity < 1) {
                  try {
                    await user.send(`Sorry, "${item.name}" is no longer available.`);
                  } catch (dmError) {
                    console.error(`Could not DM user ${user.id}:`, dmError);
                  }
                  return;
                }
                
                const existingRequestResult = await pool.query(
                  `SELECT id FROM loot_requests 
                   WHERE storage_item_id = $1 AND user_id = $2 AND status = 'Pending'`,
                  [item.id, userId]
                );
                
                if (existingRequestResult.rows.length) {
                  try {
                    await user.send(`You already have a pending request for "${item.name}".`);
                  } catch (dmError) {
                    console.error(`Could not DM user ${user.id}:`, dmError);
                  }
                  return;
                }
                
                const requestResult = await pool.query(
                  `INSERT INTO loot_requests
                   (id, guild_id, storage_item_id, user_id, status, priority, created_at, updated_at)
                   VALUES
                   (gen_random_uuid(), $1, $2, $3, 'Pending', $4, NOW(), NOW())
                   RETURNING id`,
                  [item.guild_id, item.id, userId, priority === 'Need' ? 1 : 0]
                );
                
                const requestId = requestResult.rows[0].id;
                
                itemRequestMessages.set(requestId, {
                  messageId: message.id,
                  channelId: message.channel.id,
                  itemId: item.id
                });
                
                try {
                  await user.send(`Your ${priority} request for "${item.name}" has been submitted!`);
                } catch (dmError) {
                  console.error(`Could not DM user ${user.id}:`, dmError);
                }
                
                const requestEmbed = new EmbedBuilder()
                  .setTitle('New Loot Request')
                  .setDescription(`**${user.username}** has requested **${item.name}** (${priority})`)
                  .setColor('#9c27b0')
                  .setTimestamp()
                  .setFooter({ text: `Request ID: ${requestId}` });
                
                const lootMessage = await sendNotificationToConfiguredChannel(
                  item.guild_id, 
                  item.discord_guild_id, 
                  'loot', 
                  requestEmbed,
                  null,
                  [
                    new ActionRowBuilder()
                      .addComponents(
                        new ButtonBuilder()
                          .setCustomId(`approve_loot_${requestId}`)
                          .setLabel('Approve')
                          .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                          .setCustomId(`deny_loot_${requestId}`)
                          .setLabel('Deny')
                          .setStyle(ButtonStyle.Danger)
                      )
                  ]
                );
              } catch (error) {
                console.error(`Error processing reaction:`, error);
              }
            });
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