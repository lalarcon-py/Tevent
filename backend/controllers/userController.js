// backend/controllers/userController.js
const db = require('../models');
const { sequelize } = require('../config/database');

const userController = {
  deleteUser: async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    const t = await sequelize.transaction();
    
    try {
      console.log(`Starting deletion process for user ${userId}...`);
      
      // 1. Get all guilds the user is a member of
      const userGuilds = await db.GuildMember.findAll({
        where: { user_id: userId },
        attributes: ['guild_id'],
        transaction: t
      });
      
      const guildIds = userGuilds.map(member => member.guild_id);
      
      // 2. Remove user from all guilds
      await db.GuildMember.destroy({
        where: { user_id: userId },
        transaction: t
      });
      console.log(`Removed user ${userId} from all guilds`);
      
      // 3. Delete user's data in each guild context
      for (const guildId of guildIds) {
        // 3.1 Delete user's loot requests
        await db.LootRequest.destroy({
          where: { 
            user_id: userId,
            guild_id: guildId
          },
          transaction: t
        });
        
        // 3.2 Delete event participation
        await db.EventParticipant.destroy({
          where: { 
            user_id: userId,
            guild_id: guildId
          },
          transaction: t
        });
        
        // 3.3 Delete team memberships
        await db.TeamMember.destroy({
          where: { 
            user_id: userId,
            guild_id: guildId
          },
          transaction: t
        });
        
        // 3.4 Delete wishlist items
        if (db.WishList) {
          await db.WishList.destroy({
            where: { 
              user_id: userId,
              guild_id: guildId
            },
            transaction: t
          });
        }
        
        // 3.5 Handle user's created events
        const userEvents = await db.Event.findAll({
          where: { 
            created_by: userId,
            guild_id: guildId
          },
          transaction: t
        });
        
        for (const event of userEvents) {
          // Delete team members for this event's teams
          await db.TeamMember.destroy({
            where: { 
              team_id: {
                [db.Sequelize.Op.in]: sequelize.literal(`(SELECT id FROM teams WHERE event_id = '${event.id}' AND guild_id = '${guildId}')`)
              },
              guild_id: guildId
            },
            transaction: t
          });
          
          // Delete teams for this event
          await db.Team.destroy({
            where: { 
              event_id: event.id,
              guild_id: guildId
            },
            transaction: t
          });
          
          // Delete participants for this event
          await db.EventParticipant.destroy({
            where: { 
              event_id: event.id,
              guild_id: guildId
            },
            transaction: t
          });
        }
        
        // Delete the events
        await db.Event.destroy({
          where: { 
            created_by: userId,
            guild_id: guildId
          },
          transaction: t
        });
        
        // Delete the user record for this guild
        await db.User.destroy({
          where: { 
            id: userId,
            guild_id: guildId
          },
          transaction: t
        });
      }
      
      // 7. Finally delete the user from the main table
      await db.User.destroy({
        where: { 
          id: userId,
          guild_id: null // Only delete the global user record
        },
        transaction: t
      });
      
      console.log(`User ${userId} account completely deleted`);
      
      await t.commit();
      
      // Clear session
      req.logout(err => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Failed to complete logout during account deletion' });
        }
        
        req.session.destroy(err => {
          if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ error: 'Failed to destroy session during account deletion' });
          }
          
          res.clearCookie('connect.sid');
          res.json({ message: 'Account deleted successfully' });
        });
      });
    } catch (error) {
      await t.rollback();
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete account', details: error.message });
    }
  }
};

module.exports = userController;