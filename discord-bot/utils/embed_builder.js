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
    try {
        // Handle case where members might be undefined
        const members = team.members || [];
        
        // Format members by role
        const tanks = members.filter(m => m.role === 'TANK') || [];
        const healers = members.filter(m => m.role === 'HEALER') || [];
        const dps = members.filter(m => m.role === 'DPS') || [];
        
        // Calculate total participants
        const totalParticipants = tanks.length + healers.length + dps.length;
        
        // Get absentees and tentative members (if available in your data structure)
        const late = team.late || [];
        const tentative = team.tentative || [];
        const extras = late.length + tentative.length;
        
        // Calculate total with extras
        const totalDisplay = `${totalParticipants}${extras > 0 ? ` (+${extras})` : ''}`;
        
        // Format date string (adjust based on your event data structure)
        const eventDate = new Date(team.event_time || team.created_at || new Date());
        const dateString = eventDate.toLocaleDateString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric' 
        });
        const timeString = eventDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        
        // Time ago calculation
        const now = new Date();
        const diffTime = Math.abs(now - eventDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let timeAgoString = '';
        
        if (diffDays === 0) {
            timeAgoString = 'today';
        } else if (diffDays === 1) {
            timeAgoString = 'a day ago';
        } else {
            timeAgoString = `${diffDays} days ago`;
        }
        
        // Format players with numbers - exactly like image
        const formatPlayers = (players) => {
            if (!players || players.length === 0) return '—';
            
            return players.map((player, index) => {
                const username = player.User?.username || player.username || 'Unknown';
                return `${index + 1} ${username}`;
            }).join('\n');
        };
        
        // Create the embed with exact formatting as shown in image
        const embed = new EmbedBuilder()
            .setTitle(`Conflict ${team.name || 'Tevent/Bellandir'}`)
            .setColor('#DC143C') // Crimson red color
            .setDescription(`👤 ${totalDisplay}\n📅 ${dateString}    ⏰ ${timeString}    ⏱ ${timeAgoString}`)
            .addFields(
                { 
                    name: `Tank (${tanks.length})`, 
                    value: formatPlayers(tanks), 
                    inline: true 
                },
                { 
                    name: `Dps (${dps.length})`, 
                    value: formatPlayers(dps), 
                    inline: true 
                },
                { 
                    name: `Healer (${healers.length})`, 
                    value: formatPlayers(healers), 
                    inline: true 
                }
            );
        
        // Add late section if members exist
        if (late.length > 0) {
            embed.addFields({
                name: `⏲ Late (${late.length}):`,
                value: formatPlayers(late),
                inline: false
            });
        }
        
        // Add tentative section if members exist
        if (tentative.length > 0) {
            embed.addFields({
                name: `⏳ Tentative (${tentative.length}):`,
                value: formatPlayers(tentative),
                inline: false
            });
        }
        
        // Add footer with links exactly as shown in image
        embed.setFooter({ text: `Web View | Comp | Gcat | Premium` });
        
        return embed;
    } catch (error) {
        console.error('Error creating team embed:', error);
        // Return a simple fallback embed if there's an error
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