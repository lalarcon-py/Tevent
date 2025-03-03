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
      
      // 1. Remove user from all guilds
      await db.GuildMember.destroy({
        where: { user_id: userId },
        transaction: t
      });
      console.log(`Removed user ${userId} from all guilds`);
      
      // 2. Delete user's loot requests
      await db.LootRequest.destroy({
        where: { user_id: userId },
        transaction: t
      });
      
      // 3. Delete event participation
      await db.EventParticipant.destroy({
        where: { user_id: userId },
        transaction: t
      });
      
      // 4. Delete team memberships
      await db.TeamMember.destroy({
        where: { user_id: userId },
        transaction: t
      });
      
      // 5. Delete wishlist items if model exists
      if (db.WishList) {
        await db.WishList.destroy({
          where: { user_id: userId },
          transaction: t
        });
      }
      
      // 6. Delete created events (optional, can be kept if you want to preserve event history)
      // If you want to delete events created by the user:
      const userEvents = await db.Event.findAll({
        where: { created_by: userId },
        transaction: t
      });
      
      for (const event of userEvents) {
        // Delete team members for this event's teams
        await db.TeamMember.destroy({
          where: { 
            team_id: {
              [db.Sequelize.Op.in]: sequelize.literal(`(SELECT id FROM teams WHERE event_id = '${event.id}')`)
            }
          },
          transaction: t
        });
        
        // Delete teams for this event
        await db.Team.destroy({
          where: { event_id: event.id },
          transaction: t
        });
        
        // Delete participants for this event
        await db.EventParticipant.destroy({
          where: { event_id: event.id },
          transaction: t
        });
      }
      
      // Then delete the events
      await db.Event.destroy({
        where: { created_by: userId },
        transaction: t
      });
      
      // 7. Finally delete the user
      await db.User.destroy({
        where: { id: userId },
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