const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Creates Discord embeds for various guild data
 */
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
      
      // Format date and time
      const dateFormatted = eventTime.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const timeFormatted = eventTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Handle case where participants might be undefined
      const participants = event.participants || [];
      
      // Group participants by role
      const tanks = Array.isArray(participants) 
        ? participants.filter(p => p.role === 'TANK')
        : [];
      
      const healers = Array.isArray(participants) 
        ? participants.filter(p => p.role === 'HEALER')
        : [];
      
      const dps = Array.isArray(participants) 
        ? participants.filter(p => p.role === 'DPS')
        : [];
      
      const absentees = Array.isArray(participants) 
        ? participants.filter(p => p.role === 'ABSENT')
        : [];
      
      // Helper function to format participant lists
      const formatParticipants = (roleParticipants) => {
        if (!roleParticipants || roleParticipants.length === 0) return '—';
        
        return roleParticipants.map((p, idx) => {
          // Get username - handle different data structures
          const username = p.User?.username || p.username || 'Unknown';
          
          // Get weapon information if available
          let weaponText = '';
          
          // Handle builds that might be in User object or directly on participant
          let builds = p.User?.builds || p.builds || [];
          
          // Parse builds if it's a string
          if (typeof builds === 'string') {
            try {
              builds = JSON.parse(builds);
            } catch (error) {
              console.error(`Error parsing builds for user ${username}:`, error);
              builds = [];
            }
          }
          
          // Ensure builds is an array
          builds = Array.isArray(builds) ? builds : [];
          
          if (builds.length > 0) {
            const build = builds[0];
            if (build && (build.primary || build.secondary)) {
              if (build.primary) weaponText += ` ${build.primary}`;
              if (build.primary && build.secondary) weaponText += '/';
              if (build.secondary) weaponText += `${build.secondary}`;
            }
          }
          
          return `${idx + 1} ${username}${weaponText}`;
        }).join('\n');
      };
      
      // Total participants count
      const totalParticipants = tanks.length + healers.length + dps.length;
      
      const embed = new EmbedBuilder()
        .setTitle(event.title || 'Event')
        .setDescription(event.description || 'No description provided')
        .setColor('#1a64f3')
        .addFields(
          { 
            name: `${totalParticipants} (${absentees.length})`, 
            value: `📅 ${dateFormatted} ⏱️ ${timeFormatted}`, 
            inline: false 
          },
          { 
            name: `🛡️ Tank (${tanks.length}/${event.tanks || 0})`, 
            value: formatParticipants(tanks), 
            inline: true 
          },
          { 
            name: `⚔️ Dps (${dps.length}/${event.dps || 0})`, 
            value: formatParticipants(dps), 
            inline: true 
          },
          { 
            name: `💚 Healer (${healers.length}/${event.healers || 0})`, 
            value: formatParticipants(healers), 
            inline: true 
          }
        )
        .setFooter({ text: `Event ID: ${event.id}` });
      
      // Add absentees if there are any
      if (absentees.length > 0) {
        embed.addFields({
          name: `⛔ Absence (${absentees.length})`,
          value: absentees.map(p => p.User?.username || p.username).join(', '),
          inline: false
        });
      }
      
      return embed;
    } catch (error) {
      console.error('Error creating event embed:', error);
      // Return a simple fallback embed if there's an error
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
    const tanks = team.members?.filter(m => m.role === 'TANK') || [];
    const healers = team.members?.filter(m => m.role === 'HEALER') || [];
    const dps = team.members?.filter(m => m.role === 'DPS') || [];
    
    const embed = new EmbedBuilder()
      .setTitle(`👥 Team: ${team.name}`)
      .setColor('#2ecc71')
      .addFields(
        { 
          name: '🛡️ Tanks', 
          value: tanks.length > 0 ? 
            tanks.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
          inline: true 
        },
        { 
          name: '💚 Healers', 
          value: healers.length > 0 ? 
            healers.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
          inline: true 
        },
        { 
          name: '⚔️ DPS', 
          value: dps.length > 0 ? 
            dps.map(m => m.User?.username || 'Unknown').join('\n') : 'None', 
          inline: true 
        }
      )
      .setFooter({ text: `Team ID: ${team.id}` });
    
    return embed;
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