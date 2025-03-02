const { Event, User, EventParticipant, Team, TeamMember, Guild, GuildMember } = require('../../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * Database utility functions for Discord bot
 */
module.exports = {
  /**
   * Get upcoming events for a guild
   */
  getUpcomingEvents: async (guildId, days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return await Event.findAll({
      where: {
        event_time: {
          [Op.between]: [now, futureDate]
        }
      },
      include: [{
        model: EventParticipant,
        as: 'participants',
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }],
      order: [['event_time', 'ASC']]
    });
  },
  
  /**
   * Get teams for an event
   */
  getEventTeams: async (eventId) => {
    return await Team.findAll({
      where: { event_id: eventId },
      include: [{
        model: TeamMember,
        as: 'members',
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id', 'builds', 'combat_power']
        }]
      }],
      order: [['name', 'ASC']]
    });
  },
  
  /**
   * Get attendance statistics for guild members
   */
  getAttendanceStats: async (guildId) => {
    // Calculate attendance percentages for all members
    const [results] = await sequelize.query(`
      WITH event_counts AS (
        SELECT COUNT(*) as total_events
        FROM events
        WHERE guild_id = :guildId
        AND event_time < NOW()
      ),
      member_attendance AS (
        SELECT 
          u.id,
          u.username,
          COUNT(ep.id) as events_attended
        FROM users u
        JOIN guild_members gm ON u.id = gm.user_id
        LEFT JOIN event_participants ep ON u.id = ep.user_id
        JOIN events e ON ep.event_id = e.id AND e.guild_id = :guildId
        WHERE gm.guild_id = :guildId
        GROUP BY u.id, u.username
      )
      SELECT 
        ma.id,
        ma.username,
        ma.events_attended,
        ec.total_events,
        ROUND((ma.events_attended::float / NULLIF(ec.total_events, 0)) * 100, 1) as attendance_rate
      FROM member_attendance ma, event_counts ec
      ORDER BY attendance_rate DESC
    `, {
      replacements: { guildId },
      type: Sequelize.QueryTypes.SELECT
    });
    
    return results;
  },
  
  /**
   * Sign up a user for an event
   */
  signUpForEvent: async (guildId, eventId, discordUserId, role) => {
    const user = await User.findOne({
      where: { discord_id: discordUserId }
    });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    const event = await Event.findOne({
      where: { id: eventId, guild_id: guildId }
    });
    
    if (!event) {
      return { success: false, message: 'Event not found' };
    }
    
    // Check if user is already signed up
    const existing = await EventParticipant.findOne({
      where: {
        event_id: eventId,
        user_id: user.id
      }
    });
    
    if (existing) {
      // Update role if already signed up
      await existing.update({ role });
      return { success: true, message: 'Role updated' };
    }
    
    // Check if role is full
    const participants = await EventParticipant.findAll({
      where: { event_id: eventId, role }
    });
    
    const roleLimits = {
      'TANK': event.tanks,
      'HEALER': event.healers,
      'DPS': event.dps
    };
    
    if (participants.length >= roleLimits[role]) {
      return { success: false, message: `${role} slots are full` };
    }
    
    // Create new signup
    await EventParticipant.create({
      event_id: eventId,
      user_id: user.id,
      role
    });
    
    return { success: true };
  },
  
  /**
   * Get guild ID from Discord server ID
   */
  getGuildIdFromDiscord: async (discordServerId) => {
    const guild = await Guild.findOne({
      where: { discord_server_id: discordServerId }
    });
    
    return guild ? guild.id : null;
  },
  
  /**
   * Get members with their roles
   */
  getMembers: async (guildId) => {
    return await GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'discord_id', 'builds', 'combat_power']
      }]
    });
  },

  updateEventAttendance: async (eventId, userId, attended) => {
    // Check if there's an existing record
    const existingAttendance = await EventAttendance.findOne({
      where: {
        event_id: eventId,
        user_id: userId
      }
    });
    
    if (existingAttendance) {
      await existingAttendance.update({ 
        attended,
        status: attended ? 'ATTENDED' : 'ABSENT'
      });
    } else {
      await EventAttendance.create({
        event_id: eventId,
        user_id: userId,
        attended,
        status: attended ? 'ATTENDED' : 'ABSENT'
      });
    }
    
    return { success: true };
  },
  
  /**
   * Get items in guild storage
   */
  getGuildStorageItems: async (guildId) => {
    return await GuildStorageItem.findAll({
      include: [{
        model: Item,
        attributes: ['name', 'type', 'icon']
      }]
    });
  },
  
  /**
   * Get pending loot requests
   */
  getLootRequests: async (guildId) => {
    return await LootRequest.findAll({
      where: { status: 'Pending' },
      include: [
        {
          model: GuildStorageItem,
          as: 'storageItem',
          include: [Item]
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });
  },
  
  /**
   * Approve a loot request
   */
  approveLootRequest: async (guildId, requestId) => {
    const request = await LootRequest.findByPk(requestId, {
      include: [
        {
          model: GuildStorageItem,
          as: 'storageItem',
          include: [Item]
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });
    
    if (!request) {
      return { success: false, message: 'Request not found' };
    }
    
    // Check if item is still available
    if (request.storageItem.quantity < 1) {
      return { success: false, message: 'Item no longer available in storage' };
    }
    
    // Update request status
    await request.update({ status: 'Approved' });
    
    // Decrement quantity
    await request.storageItem.decrement('quantity');
    
    return { 
      success: true,
      userId: request.user.id,
      username: request.user.username,
      discordId: request.user.discord_id,
      itemName: request.storageItem.Item.name
    };
  },
  
  /**
   * Deny a loot request
   */
  denyLootRequest: async (guildId, requestId) => {
    const request = await LootRequest.findByPk(requestId, {
      include: [
        {
          model: GuildStorageItem,
          as: 'storageItem',
          include: [Item]
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });
    
    if (!request) {
      return { success: false, message: 'Request not found' };
    }
    
    // Update request status
    await request.update({ status: 'Denied' });
    
    return { 
      success: true,
      userId: request.user.id,
      username: request.user.username,
      discordId: request.user.discord_id,
      itemName: request.storageItem.Item.name
    };
  },
  
  /**
   * Create a loot request
   */
  createLootRequest: async (guildId, itemId, discordUserId) => {
    const user = await User.findOne({
      where: { discord_id: discordUserId }
    });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    const storageItem = await GuildStorageItem.findByPk(itemId, {
      include: [Item]
    });
    
    if (!storageItem) {
      return { success: false, message: 'Item not found in storage' };
    }
    
    // Check if user already has a pending request for this item
    const existingRequest = await LootRequest.findOne({
      where: {
        storage_item_id: itemId,
        user_id: user.id,
        status: 'Pending'
      }
    });
    
    if (existingRequest) {
      return { success: false, message: 'You already have a pending request for this item' };
    }
    
    // Create new request
    const request = await LootRequest.create({
      storage_item_id: itemId,
      user_id: user.id,
      status: 'Pending'
    });
    
    return { 
      success: true,
      requestId: request.id,
      itemName: storageItem.Item.name
    };
  },
  
  /**
   * Get a user by Discord ID
   */
  getUserByDiscordId: async (discordId) => {
    return await User.findOne({
      where: { discord_id: discordId }
    });
  }
};