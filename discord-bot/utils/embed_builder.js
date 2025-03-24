// discord-bot/utils/embed_builder.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

function getWeaponEmoji(weaponType) {
  if (!weaponType) return '';
  
  // Convert to string and lowercase for consistent matching
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
  
  // Try direct match first
  if (emojiMap[type]) {
    return emojiMap[type];
  }
  
  // If no direct match, try partial match
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (type.includes(key)) {
      return emoji;
    }
  }
  
  return ''; // No matching emoji found
}

module.exports = {
  
  /**
   * Create an embed for an event
   */
  // In embed_builder.js, replace the entire createEventEmbed function
createEventEmbed: (event) => {
  try {
    // Ensure we have an event object
    if (!event) {
      console.error('Tried to create event embed with undefined event');
      return new EmbedBuilder()
        .setTitle('Event Details')
        .setDescription('Error creating detailed event information')
        .setColor('#ff0000');
    }
    
    // Convert event_time to Date if it's a string
    const eventTime = event.event_time ? 
      (typeof event.event_time === 'string' ? new Date(event.event_time) : event.event_time)
      : new Date();
    
    // Check if event has passed
    const now = new Date();
    const eventHasPassed = eventTime < now;
    
    // Calculate time until event
    const timeUntil = eventTime - now;
    const daysUntil = Math.floor(timeUntil / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor((timeUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    // Status indicators based on time
    let statusEmoji = '🔶'; // Default - upcoming
    let statusColor = '#0099ff'; // Default blue color
    
    if (eventHasPassed) {
      statusEmoji = '✓'; 
      statusColor = '#808080'; // Gray for past events
    } else if (timeUntil < 3600000) { // Less than 1 hour
      statusEmoji = '⚠️';
      statusColor = '#ff9900'; // Orange for imminent
    } else if (daysUntil === 0) { // Today
      statusEmoji = '🔴';
      statusColor = '#f44336'; // Red for today
    }
    
    // Convert to Unix timestamp (seconds since epoch)
    const unixTimestamp = Math.floor(eventTime.getTime() / 1000);
    
    // Use Discord's timestamp formatting
    const discordTimestamp = `<t:${unixTimestamp}:F>`; // F = Full date and time
    const discordRelative = `<t:${unixTimestamp}:R>`; // R = Relative time
    
    // Hardcoded emoji strings
    const tankEmoji = '<:Tank:1352736996405022780>';
    const healerEmoji = '<:Healer:1352737011479482468>';
    const dpsEmoji = '<:DPS:1352737043972624518>';
    
    // Format countdown using Discord's relative time for consistency
    let countdownText = discordRelative;
    
    // Get participants - handle various data formats
    let participants = [];
    if (Array.isArray(event.participants)) {
      participants = event.participants;
    } else if (event.participants && typeof event.participants === 'object') {
      // For when participants is an object with counts
      participants = [];
    }
    
    // Count players by role
    const tanks = Array.isArray(participants) ? 
      participants.filter(p => p.role === 'TANK') : [];
    const healers = Array.isArray(participants) ? 
      participants.filter(p => p.role === 'HEALER') : [];
    const dps = Array.isArray(participants) ? 
      participants.filter(p => p.role === 'DPS') : [];
    
    // Format players as a string
    const formatPlayers = (players) => {
      if (!Array.isArray(players) || players.length === 0) return '—';
      
      return players.map((p, idx) => {
        const username = p.User?.username || p.username || 'Unknown';
        return `${idx + 1}. ${username}`;
      }).join('\n');
    };
    
    // Handle absentees with proper null checking
    let absentees = [];
    if (Array.isArray(event.absentees)) {
      absentees = event.absentees;
    } else if (event.EventAbsentees && Array.isArray(event.EventAbsentees)) {
      absentees = event.EventAbsentees;
    }
    
    const formatAbsentees = () => {
      if (!Array.isArray(absentees) || absentees.length === 0) return '—';
      
      return absentees.map((a, idx) => {
        const username = a.User?.username || a.username || 'Unknown';
        return `${idx + 1}. ${username}`;
      }).join('\n');
    };
    
    // Handle tentative participants with proper null checking
    let tentative = [];
    if (Array.isArray(event.tentative)) {
      tentative = event.tentative;
    } else if (event.EventTentative && Array.isArray(event.EventTentative)) {
      tentative = event.EventTentative;
    }
    
    const formatTentative = () => {
      if (!Array.isArray(tentative) || tentative.length === 0) return '—';
      
      return tentative.map((t, idx) => {
        const username = t.User?.username || t.username || 'Unknown';
        return `${idx + 1}. ${username}`;
      }).join('\n');
    };
    
    // Get tank, healer, and DPS counts - handle various data formats
    let tankCount = 0;
    let healerCount = 0;
    let dpsCount = 0;
    
    if (Array.isArray(participants)) {
      tankCount = tanks.length;
      healerCount = healers.length;
      dpsCount = dps.length;
    } else if (event.participants && typeof event.participants === 'object') {
      // Handle the case where participants is an object with counts
      tankCount = event.participants.tank_count || 0;
      healerCount = event.participants.healer_count || 0;
      dpsCount = event.participants.dps_count || 0;
    } else if (event.tank_count !== undefined || event.healer_count !== undefined || event.dps_count !== undefined) {
      // Handle the case where counts are directly on the event
      tankCount = event.tank_count || 0;
      healerCount = event.healer_count || 0;
      dpsCount = event.dps_count || 0;
    }
    
    // Create embed with simplified title and description
    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} ${event.title || 'Event'}`)
      .setColor(statusColor)
      .setDescription(`${countdownText}${event.description ? `\n\n${event.description}` : ''}`);
    
    // Use Discord timestamp for time display - add individually for safety
    embed.addFields({
      name: '⏰ Time & Date', 
      value: discordTimestamp || 'Time not set', 
      inline: false 
    });
    
    // Add location if provided
    embed.addFields({
      name: '📍 Location', 
      value: event.location || 'Not specified', 
      inline: false 
    });
    
    // Add tank field separately
    embed.addFields({
      name: `${tankEmoji} Tanks (${tankCount}/${event.tanks || 0})`, 
      value: formatPlayers(tanks), 
      inline: true 
    });
    
    // Add healer field separately
    embed.addFields({
      name: `${healerEmoji} Healers (${healerCount}/${event.healers || 0})`, 
      value: formatPlayers(healers), 
      inline: true 
    });
    
    // Add DPS field separately
    embed.addFields({
      name: `${dpsEmoji} DPS (${dpsCount}/${event.dps || 0})`, 
      value: formatPlayers(dps), 
      inline: true 
    });
    
    // Add absentees separately
    embed.addFields({
      name: `❌ Absent (${absentees.length || 0})`, 
      value: formatAbsentees(), 
      inline: true
    });
    
    // Add tentative separately
    embed.addFields({
      name: `⏳ Tentative (${tentative.length || 0})`, 
      value: formatTentative(), 
      inline: true
    });
    
    if (eventHasPassed) {
      embed.addFields({
        name: '⚠️ Event Status',
        value: 'This event has already ended',
        inline: false
      });
    }
    
    // Add footer
    embed.setFooter({ 
      text: `Use buttons below to sign up • Event ID: ${event.id}` 
    });
    
    return embed;
  } catch (error) {
    console.error('Error creating event embed:', error, error.stack);
    return new EmbedBuilder()
      .setTitle('Event Details')
      .setDescription('Error creating detailed event information')
      .setColor('#ff0000');
  }
},
  
  /**
   * Create an embed for a team
   */
  createTeamEmbed: (team) => {
    try {
      const members = team.members || [];
      const totalParticipants = members.length;
      const late = team.late || [];
      const tentative = team.tentative || [];
      const extras = late.length + tentative.length;
      
      const totalDisplay = `${totalParticipants}${extras > 0 ? ` (+${extras})` : ''}`;
      
      // Format date string
      const eventDate = new Date(team.event_time || team.created_at || new Date());
      const dateString = eventDate.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' 
      });
      const timeString = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
      
      const now = new Date();
      const diffTime = Math.abs(now - eventDate);
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let timeAgoString = '';
      if (diffHours < 1) {
        timeAgoString = '`Just now`';
      } else if (diffHours < 24) {
        timeAgoString = `\`${diffHours}h ago\``;
      } else if (diffDays === 1) {
        timeAgoString = '`Yesterday`';
      } else {
        timeAgoString = `\`${diffDays}d ago\``;
      }
      
      // Format players with weapon icons (no role separation)
      const formatPlayers = (players) => {
        if (players.length === 0) return '—';
        
        return players.map((p, idx) => {
          const name = p.User?.username || p.username || 'Unknown';
          let primaryEmoji = '';
          let secondaryEmoji = '';
          let className = '';
          
          try {
            // Get the user's builds
            let userBuilds = [];
            if (p.User?.builds) {
              userBuilds = typeof p.User.builds === 'string' 
                ? JSON.parse(p.User.builds) 
                : p.User.builds;
            } else if (p.builds) {
              userBuilds = typeof p.builds === 'string' 
                ? JSON.parse(p.builds) 
                : p.builds;
            }
            
            // Just use the first build for simplicity
            if (Array.isArray(userBuilds) && userBuilds.length > 0) {
              const build = userBuilds[0];
              primaryEmoji = getWeaponEmoji(build.primary);
              secondaryEmoji = getWeaponEmoji(build.secondary);
              className = build.weapon_spec;
            }
          } catch (e) {
            console.error(`Error processing builds for player ${name}:`, e);
          }
          
          // Create display with both weapon emojis and class name
          const weaponDisplay = secondaryEmoji ? `${primaryEmoji}${secondaryEmoji} ` : primaryEmoji ? `${primaryEmoji} ` : '';
          const classDisplay = className ? ` (${className})` : '';
          return `${idx + 1}. ${weaponDisplay}**${name}**${classDisplay}`;
        }).join('\n');
      };
      
      // Determine team color based on event or team type
      let teamColor = '#1a64f3'; // Default blue
      if (team.type === 'PVP') {
        teamColor = '#f44336'; // Red for PVP
      } else if (team.type === 'RAID') {
        teamColor = '#9c27b0'; // Purple for raid
      } else if (team.name && team.name.toLowerCase().includes('conflict')) {
        teamColor = '#DC143C'; // Crimson for conflict teams
      }
      
      // Create the embed with modern styling
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${team.name || 'Team'}`)
        .setColor(teamColor)
        .setDescription(
          `👥 **Total Members: ${totalDisplay}**\n` +
          `📅 ${dateString} • ⏰ ${timeString}\n` +
          `${team.event_title ? `**Event: ${team.event_title}**\n` : ''}` +
          `${team.description ? `**Notes:** ${team.description}\n` : ''}`
        );
      
      // Add all members together in one field (no role separation)
      embed.addFields({
        name: 'Team Members',
        value: formatPlayers(members),
        inline: false
      });
      
      // Add late and tentative sections if members exist
      if (late.length > 0) {
        embed.addFields({
          name: `⏲️ Coming Late (${late.length})`,
          value: formatPlayers(late),
          inline: true
        });
      }
      
      if (tentative.length > 0) {
        embed.addFields({
          name: `⏳ Tentative (${tentative.length})`,
          value: formatPlayers(tentative),
          inline: true
        });
      }
      
      // Add footer with useful information
      embed.setFooter({ 
        text: `Team ID: ${team.id} • Created ${timeAgoString.replace(/`/g, '')}` 
      });
      
      return embed;
    } catch (error) {
      console.error('Error creating team embed:', error);
      return new EmbedBuilder()
        .setTitle('Team Details')
        .setDescription('Error creating detailed team information')
        .setColor('#ff0000');
    }
  },
  
  /**
   * Create an embed for attendance statistics
   */
  createAttendanceEmbed: (stats) => {
    const embed = new EmbedBuilder()
      .setTitle('📊 Attendance Statistics')
      .setColor('#e74c3c')
      .setDescription(`Total events: ${stats[0]?.total_events || 0}`);
    
    // Top attendance (top 10)
    const topMembers = stats.slice(0, 10).map(s => 
      `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
    ).join('\n');
    
    if (topMembers) {
      embed.addFields({ name: '🏆 Top Attendance', value: topMembers });
    }
    
    // Members below threshold (if applicable)
    const lowAttendance = stats.filter(s => s.attendance_rate < 50).map(s =>
      `${s.username}: ${s.attendance_rate}% (${s.events_attended}/${s.total_events})`
    ).join('\n');
    
    if (lowAttendance) {
      embed.addFields({ name: '⚠️ Low Attendance', value: lowAttendance });
    }
    
    return embed;
  },
  
  /**
   * Create an embed for member roles
   */
  createMembersEmbed: (members) => {
    // Group by role
    const roleGroups = {};
    members.forEach(member => {
      const role = member.role;
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(member);
    });
    
    const embed = new EmbedBuilder()
      .setTitle('👥 Guild Members')
      .setColor('#9b59b6')
      .setDescription(`Total members: ${members.length}`);
    
    // Add each role as a field
    for (const [role, roleMembers] of Object.entries(roleGroups)) {
      embed.addFields({
        name: `${role} (${roleMembers.length})`,
        value: roleMembers.map(m => m.User?.username || 'Unknown').join('\n')
      });
    }
    
    return embed;
  },

  createStorageEmbed: (items) => {
    const embed = new EmbedBuilder()
      .setTitle('📦 Guild Storage')
      .setColor('#ff9800')
      .setDescription(`Total items: ${items.length || 0}`);
    
    // Group by item type
    const itemsByType = {};
    items.forEach(item => {
      const type = item.Item?.type || 'Unknown';
      if (!itemsByType[type]) {
        itemsByType[type] = [];
      }
      itemsByType[type].push(item);
    });
    
    // Add each type as a field
    for (const [type, typeItems] of Object.entries(itemsByType)) {
      embed.addFields({
        name: `${type} (${typeItems.length})`,
        value: typeItems.map(item => 
          `ID: ${item.id} - ${item.Item?.name || 'Unknown'} x${item.quantity || 0}`
        ).join('\n') || 'None',
        inline: false
      });
    }
    
    return embed;
  },
  
  /**
   * Create an embed for loot requests
   */
  createLootRequestsEmbed: (requests) => {
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
    
    requests.forEach((request, index) => {
      const storageItem = request.storageItem || request.StorageItem;
      const item = storageItem?.Item || storageItem?.item;
      const user = request.user || request.User;
      
      embed.addFields({
        name: `Request #${index + 1} (ID: ${request.id})`,
        value: `**Item:** ${item?.name || 'Unknown Item'}\n` +
          `**Requester:** ${user?.username || 'Unknown User'}\n` +
          `**Requested:** ${new Date(request.created_at).toLocaleString()}`,
        inline: false
      });
    });
    
    embed.setFooter({ text: 'Use "/loot approve" or "/loot deny" to handle requests' });
    
    return embed;
  }
};