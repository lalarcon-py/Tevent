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
  createEventEmbed: (event) => {
    try {
      // Convert event_time to Date if it's a string
      const eventTime = typeof event.event_time === 'string' 
        ? new Date(event.event_time) 
        : event.event_time;
      
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
      
      // Hardcoded emoji strings
      const tankEmoji = '<:Tank:1352736996405022780>';
      const healerEmoji = '<:Healer:1352737011479482468>';
      const dpsEmoji = '<:DPS:1352737043972624518>';
      
      // Format the time for display
      const dateFormatted = eventTime.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
      });
      const timeFormatted = eventTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
      
      // Format countdown
      let countdownText = '';
      if (eventHasPassed) {
        countdownText = '`Event ended`';
      } else if (daysUntil === 0 && hoursUntil === 0) {
        countdownText = '`Starting soon!`';
      } else if (daysUntil === 0) {
        countdownText = `\`In ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}\``;
      } else if (daysUntil === 1) {
        countdownText = '`Tomorrow`';
      } else {
        countdownText = `\`In ${daysUntil} days\``;
      }
      
      // Get participants
      let participants = event.participants || [];
      
      // Count players by role
      const tanks = participants.filter(p => p.role === 'TANK');
      const healers = participants.filter(p => p.role === 'HEALER');
      const dps = participants.filter(p => p.role === 'DPS');
      
      // Helper function to get weapon display
      function getWeaponDisplay(weaponType) {
        if (!weaponType) return '';
        
        // Convert to string and lowercase for consistent matching
        const type = String(weaponType).toLowerCase();
        
        // Text fallbacks for common weapons - simple and reliable
        const textEmojis = {
          'dagger': '🗡️',
          'spear': '🔱',
          'wand': '🪄',
          'sword': '⚔️',
          'swordandshield': '🛡️⚔️',
          'crossbow': '🏹',
          'greatsword': '🗡️',
          'staff': '🧙',
          'bow': '🏹'
        };
        
        // Use text emoji fallbacks for reliability
        for (const [key, emoji] of Object.entries(textEmojis)) {
          if (type.includes(key)) {
            return emoji;
          }
        }
        
        // Default
        return '🔮';
      }
      
      // Format players with weapon information
      // Updated formatPlayers function to display both weapon emojis
      const formatPlayers = (players) => {
        if (players.length === 0) return '—';
        
        return players.map((p, idx) => {
          const name = p.User?.username || p.username || 'Unknown';
          let primaryEmoji = '';
          let secondaryEmoji = '';
          let className = '';
          
          // Check for weapon_spec from our class system
          if (p.weapon_spec) {
            className = WEAPON_SPECS[p.weapon_spec] || '';
            const weapons = p.weapon_spec.split('|');
            if (weapons.length >= 2) {
              primaryEmoji = getWeaponEmoji(weapons[0]);
              secondaryEmoji = getWeaponEmoji(weapons[1]);
            } else if (weapons.length === 1) {
              primaryEmoji = getWeaponEmoji(weapons[0]);
            }
          } 
          // If no weapon_spec, try to get weapons from builds
          else {
            try {
              // First check if there's a selected_build
              if (p.selected_build) {
                let selectedBuild;
                if (typeof p.selected_build === 'string') {
                  try {
                    selectedBuild = JSON.parse(p.selected_build);
                  } catch (e) {
                    selectedBuild = null;
                  }
                } else {
                  selectedBuild = p.selected_build;
                }
                
                if (selectedBuild) {
                  if (selectedBuild.primary) primaryEmoji = getWeaponEmoji(selectedBuild.primary);
                  if (selectedBuild.secondary) secondaryEmoji = getWeaponEmoji(selectedBuild.secondary);
                }
              }
              // Try direct builds property
              else if (p.builds) {
                let builds;
                if (typeof p.builds === 'string') {
                  try {
                    builds = JSON.parse(p.builds);
                  } catch (e) {
                    builds = [];
                  }
                } else if (Array.isArray(p.builds)) {
                  builds = p.builds;
                }
                
                if (Array.isArray(builds) && builds.length > 0) {
                  const primaryBuild = builds[0];
                  if (primaryBuild.primary) primaryEmoji = getWeaponEmoji(primaryBuild.primary);
                  if (primaryBuild.secondary) secondaryEmoji = getWeaponEmoji(primaryBuild.secondary);
                }
              }
              // If no selected build, look for builds in User
              else if (p.User?.builds) {
                let builds;
                if (typeof p.User.builds === 'string') {
                  try {
                    builds = JSON.parse(p.User.builds);
                  } catch (e) {
                    builds = [];
                  }
                } else {
                  builds = p.User.builds;
                }
                
                if (Array.isArray(builds) && builds.length > 0) {
                  const primaryBuild = builds[0];
                  if (primaryBuild.primary) primaryEmoji = getWeaponEmoji(primaryBuild.primary);
                  if (primaryBuild.secondary) secondaryEmoji = getWeaponEmoji(primaryBuild.secondary);
                }
              }
            } catch (e) {
              console.error(`Error processing builds for player ${name}:`, e);
            }
          }
          
          // Create display with both weapon emojis
          const weaponDisplay = secondaryEmoji ? `${primaryEmoji}${secondaryEmoji}` : primaryEmoji;
          const classDisplay = className ? ` (${className})` : '';
          return `${idx + 1}. ${weaponDisplay} **${name}**${classDisplay}`;
        }).join('\n');
      };
      
      // Get absentees
      let absentees = [];
      if (Array.isArray(event.absentees)) {
        absentees = event.absentees;
      } else if (event.EventAbsentees && Array.isArray(event.EventAbsentees)) {
        absentees = event.EventAbsentees;
      }
      
      // Format absentees
      const formatAbsentees = () => {
        if (absentees.length === 0) return '—';
        return absentees.map((a, idx) => {
          const username = typeof a === 'string' ? a : (a.username || a.User?.username || 'Unknown');
          return `${idx + 1}. ~~**${username}**~~`;
        }).join('\n');
      };
      
      // Get tentative members
      let tentative = [];
      if (Array.isArray(event.tentative)) {
        tentative = event.tentative;
      } else if (event.EventTentative && Array.isArray(event.EventTentative)) {
        tentative = event.EventTentative;
      }
      
      // Format tentative
      const formatTentative = () => {
        if (tentative.length === 0) return '—';
        return tentative.map((t, idx) => {
          const username = typeof t === 'string' ? t : (t.username || t.User?.username || 'Unknown');
          return `${idx + 1}. **${username}**`;
        }).join('\n');
      };
      
      // Create embed with simplified title and description
      const embed = new EmbedBuilder()
        .setTitle(`${statusEmoji} ${event.title || 'Event'}`)
        .setColor(statusColor)
        .setDescription(`${countdownText}${event.description ? `\n\n${event.description}` : ''}`);
      
      // Add time as non-inline field (removing location to fix layout issues)
      embed.addFields(
        { 
          name: '⏰ Time & Date', 
          value: `📅 ${dateFormatted} at **${timeFormatted}**`, 
          inline: false 
        }
      );
      
      // Add fields for current signups with hardcoded emoji strings
      embed.addFields(
        { 
          name: `${tankEmoji} Tanks (${tanks.length}/${event.tanks || 0})`, 
          value: formatPlayers(tanks), 
          inline: true 
        },
        { 
          name: `${healerEmoji} Healers (${healers.length}/${event.healers || 0})`, 
          value: formatPlayers(healers), 
          inline: true 
        },
        { 
          name: `${dpsEmoji} DPS (${dps.length}/${event.dps || 0})`, 
          value: formatPlayers(dps), 
          inline: true 
        }
      );
      
      // Add absentees and tentative stacked vertically
      embed.addFields(
        { 
          name: `❌ Absent (${absentees.length || 0})`, 
          value: formatAbsentees(), 
          inline: false
        },
        { 
          name: `⏳ Tentative (${tentative.length || 0})`, 
          value: formatTentative(), 
          inline: false
        }
      );
      
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
      const tankEmoji = '<:Tank:1352736996405022780>';
      const healerEmoji = '<:Healer:1352737011479482468>';
      const dpsEmoji = '<:DPS:1352737043972624518>';
      
      const members = team.members || [];
      const tanks = members.filter(m => m.role === 'TANK') || [];
      const healers = members.filter(m => m.role === 'HEALER') || [];
      const dps = members.filter(m => m.role === 'DPS') || [];
      
      const totalParticipants = tanks.length + healers.length + dps.length;
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
      
      // Format players with weapon icons and better styling
      const formatPlayers = (players) => {
        if (players.length === 0) return '—';
        
        return players.map((p, idx) => {
          const name = p.User?.username || p.username || 'Unknown';
          const role = p.role; // The role the player signed up with
          let primaryEmoji = '';
          let secondaryEmoji = '';
          let className = '';
          
          try {
            // Get the player's builds
            let builds = [];
            
            // Try to get builds from various properties
            if (p.builds) {
              builds = typeof p.builds === 'string' ? JSON.parse(p.builds) : p.builds;
            } else if (p.User?.builds) {
              builds = typeof p.User.builds === 'string' ? JSON.parse(p.User.builds) : p.User.builds;
            }
            
            // Make sure builds is an array
            if (!Array.isArray(builds)) {
              builds = [];
            }
            
            // Find a build matching the player's role
            let matchingBuild = null;
            
            if (role && builds.length > 0) {
              // Look for a build with matching spec
              matchingBuild = builds.find(build => 
                build.spec && build.spec.toUpperCase() === role.toUpperCase()
              );
              
              // If no matching build, use the first one
              if (!matchingBuild) {
                matchingBuild = builds[0];
              }
            }
            
            // Extract display information from the matching build
            if (matchingBuild) {
              primaryEmoji = getWeaponEmoji(matchingBuild.primary || '');
              secondaryEmoji = getWeaponEmoji(matchingBuild.secondary || '');
              className = matchingBuild.weapon_spec || '';
            }
            // Fallback to weapon_spec column if available (for backward compatibility)
            else if (p.weapon_spec) {
              className = WEAPON_SPECS[p.weapon_spec] || '';
              const weapons = p.weapon_spec.split('|');
              if (weapons.length >= 2) {
                primaryEmoji = getWeaponEmoji(weapons[0]);
                secondaryEmoji = getWeaponEmoji(weapons[1]);
              } else if (weapons.length === 1) {
                primaryEmoji = getWeaponEmoji(weapons[0]);
              }
            }
          } catch (e) {
            console.error(`Error processing builds for player ${name}:`, e);
          }
          
          // Create display with weapon emojis and class name
          const weaponDisplay = secondaryEmoji ? `${primaryEmoji}${secondaryEmoji}` : primaryEmoji;
          const classDisplay = className ? ` (${className})` : '';
          return `${idx + 1}. ${weaponDisplay} **${name}**${classDisplay}`;
        }).join('\n');
      };
      
      // Helper function to get emoji for weapon types using custom Discord emojis
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
      
      // Create role distribution bar if we have role limits - updated with custom emojis
      if (team.max_tanks || team.max_healers || team.max_dps) {
        const roleBar = [
          `${tankEmoji} \`${tanks.length}/${team.max_tanks || '∞'}\` | ` +
          `${healerEmoji} \`${healers.length}/${team.max_healers || '∞'}\` | ` +
          `${dpsEmoji} \`${dps.length}/${team.max_dps || '∞'}\``
        ];
        
        embed.addFields({
          name: 'Role Distribution',
          value: roleBar.join('\n'),
          inline: false
        });
      }
      
      // Add role fields with enhanced styling - updated with custom emojis
      embed.addFields(
        { 
          name: `${tankEmoji} Tanks (${tanks.length})`, 
          value: formatPlayers(tanks), 
          inline: true 
        },
        { 
          name: `${healerEmoji} Healers (${healers.length})`, 
          value: formatPlayers(healers), 
          inline: true 
        },
        { 
          name: `${dpsEmoji} DPS (${dps.length})`, 
          value: formatPlayers(dps), 
          inline: true 
        }
      );
      
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