const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Creates Discord embeds for various guild data
 */
module.exports = {
  /**
   * Create an embed for an event
   */
  createEventEmbed: (event) => {
    const tankCount = event.participants?.filter(p => p.role === 'TANK').length || 0;
    const healerCount = event.participants?.filter(p => p.role === 'HEALER').length || 0;
    const dpsCount = event.participants?.filter(p => p.role === 'DPS').length || 0;
    
    const embed = new EmbedBuilder()
      .setTitle(`📅 ${event.title}`)
      .setDescription(event.description || 'No description provided')
      .setColor('#3498db')
      .addFields(
        { name: '⏰ Time', value: new Date(event.event_time).toLocaleString(), inline: false },
        { name: '📍 Location', value: event.location || 'Not specified', inline: false },
        { name: '🛡️ Tanks', value: `${tankCount}/${event.tanks}`, inline: true },
        { name: '💚 Healers', value: `${healerCount}/${event.healers}`, inline: true },
        { name: '⚔️ DPS', value: `${dpsCount}/${event.dps}`, inline: true }
      )
      .setFooter({ text: `ID: ${event.id}` })
      .setTimestamp();
    
    return embed;
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