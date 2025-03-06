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
  },
  updateEmail: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { email } = req.body;
      
      // Basic email validation
      if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Update the user's email
      await db.User.update(
        { email },
        { where: { id: req.user.id } }
      );
      
      res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({ error: 'Failed to update email' });
    }
  },
  uploadGearScreenshot: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Process file upload
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'gear');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileName = `${uuidv4()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, req.file.buffer);
      const fileUrl = `/uploads/gear/${fileName}`;
      
      // Update user with gear screenshot URL
      await db.User.update(
        { gear_screenshot_url: fileUrl },
        { where: { id: req.user.id } }
      );
      
      res.json({ 
        success: true, 
        message: 'Gear screenshot uploaded successfully',
        url: fileUrl 
      });
    } catch (error) {
      console.error('Error uploading gear screenshot:', error);
      res.status(500).json({ error: 'Failed to upload gear screenshot' });
    }
  }
};

module.exports = userController;