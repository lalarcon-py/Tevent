// backend/middleware/guildActivityMiddleware.js
const { Guild, Subscription } = require('../models');

const guildActivityMiddleware = async (req, res, next) => {
  // Skip check for non-guild routes
  const bypassRoutes = ['/api/billing', '/api/auth', '/api/discord'];
  if (bypassRoutes.some(route => req.path.startsWith(route)) || 
      req.get('X-Skip-Guild-Activity-Check') === 'true') {
    return next();
  }

  if (req.path.includes('/discord') || 
      req.path.includes('/auth') || 
      req.path.startsWith('/api/discord-setup')) {
    return next();
  }
  
  // Get guild ID from request
  const guildId = req.guildId || req.params.guildId || req.query.guildId || req.body?.guildId;
  
  if (!guildId) {
    return next(); // No guild ID, so pass through
  }
  
  try {
    // Get guild
    const guild = await Guild.findByPk(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    if (guild.status === 'ACTIVE') {
      // Guild is active, continue
      return next();
    }
    
    // If guild is marked inactive, check if it should be active
    const subscription = await Subscription.findOne({
      where: { guild_id: guildId }
    });
    
    const now = new Date();
    
    // Check if trial is still valid (7 days from creation)
    const guildCreatedAt = new Date(guild.created_at);
    const trialEndDate = new Date(guildCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    if (now < trialEndDate) {
      // Still in trial, update guild status
      await guild.update({ status: 'ACTIVE' });
      return next();
    }
    
    // Check if subscription is active
    if (subscription && new Date(subscription.expiry_date) > now) {
      // Subscription is active, update guild status
      await guild.update({ status: 'ACTIVE' });
      return next();
    }
    
    // Guild is inactive, return specific error
    return res.status(402).json({
      error: 'Guild is inactive',
      code: 'GUILD_INACTIVE',
      message: 'This guild requires an active subscription to access'
    });
  } catch (error) {
    console.error('Error checking guild activity:', error);
    return next(); // On error, allow the request to proceed
  }
};

module.exports = guildActivityMiddleware;