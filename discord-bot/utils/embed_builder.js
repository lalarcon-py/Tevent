const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Creates Discord embeds for various guild data
 */
module.exports = {
  /**
   * Create an embed for an event
   */
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
      
      // Format the time for display (keeping the existing format)
      const dateFormatted = `${eventTime.toLocaleDateString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric' 
      })}`;
      const timeFormatted = `${eventTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      })}`;
  
      // Get participants
      let participants = event.participants || [];
      
      // Count players by role
      const tanks = participants.filter(p => p.role === 'TANK');
      const healers = participants.filter(p => p.role === 'HEALER');
      const dps = participants.filter(p => p.role === 'DPS');
      
      // Format players for each role
      const formatPlayers = (players) => {
        if (players.length === 0) return '—';
        return players.map((p, idx) => {
          const name = p.User?.username || p.username || 'Unknown';
          return `${idx + 1}. ${name}`;
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
          return `${idx + 1}. ${username}`;
        }).join('\n');
      };
      
      // Create embed description
      const description = [
        `⏰ Time`,
        `📅 ${dateFormatted} ⌚ ${timeFormatted}`,
        `📍 Location`,
        `${event.location || '—'}`
      ].join('\n');
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(event.title || 'Event')
        .setColor(eventHasPassed ? '#808080' : '#0099ff')
        .setDescription(description);
      
      // Add role fields as separate columns
      embed.addFields(
        { 
          name: `🛡️ Tanks (${tanks.length}/${event.tanks || 0})`, 
          value: formatPlayers(tanks), 
          inline: true 
        },
        { 
          name: `💚 Healers (${healers.length}/${event.healers || 0})`, 
          value: formatPlayers(healers), 
          inline: true 
        },
        { 
          name: `⚔️ DPS (${dps.length}/${event.dps || 0})`, 
          value: formatPlayers(dps), 
          inline: true 
        }
      );
      
      // Add absentees and tentative
      embed.addFields(
        { 
          name: `❌ Absent (${absentees.length || 0})`, 
          value: formatAbsentees(), 
          inline: true 
        },
        { 
          name: `⏳ Tentative (0)`, 
          value: '—', 
          inline: true 
        }
      );
      
      // Add event status if it has passed
      if (eventHasPassed) {
        embed.addFields({
          name: '⚠️ Event Status',
          value: 'This event has already ended',
          inline: false
        });
      }
      
      embed.setFooter({ text: `Event ID: ${event.id}` });
      
      return embed;
    } catch (error) {
      console.error('Error creating event embed:', error);
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