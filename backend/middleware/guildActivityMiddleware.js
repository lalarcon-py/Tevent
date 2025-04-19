// backend/middleware/guildActivityMiddleware.js
const { Guild, Subscription } = require('../models');

const guildActivityMiddleware = async (req, res, next) => {
  // Skip check for billing and auth routes - these need to work regardless of subscription status
  const bypassRoutes = [
    '/api/billing', 
    '/api/auth', 
    '/api/discord',
    '/api/discord-setup'
  ];
  
  // Check if route should be exempted
  if (bypassRoutes.some(route => req.path.startsWith(route)) || 
      req.get('X-Skip-Guild-Activity-Check') === 'true') {
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
      return res.status(404).json({ 
        error: 'Guild not found',
        code: 'GUILD_NOT_FOUND'
      });
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
    const guildCreatedAt = new Date(guild.created_at || guild.createdAt);
    const trialEndDate = new Date(guildCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    if (now < trialEndDate) {
      // Still in trial, update guild status
      await guild.update({ status: 'ACTIVE' });
      return next();
    }
    
    // Check if subscription is active
    if (subscription && new Date(subscription.expiry_date) > now && subscription.status === 'active') {
      // Subscription is active, update guild status
      await guild.update({ status: 'ACTIVE' });
      return next();
    }
    
    // Calculate days remaining until guild deletion (14 days grace period)
    let daysRemaining = 0;
    if (subscription && subscription.expiry_date) {
      const expiryDate = new Date(subscription.expiry_date);
      const deletionDate = new Date(expiryDate);
      deletionDate.setDate(deletionDate.getDate() + 14);
      
      daysRemaining = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));
    } else if (!subscription) {
      // If no subscription, use guild creation date + trial period + grace period
      const gracePeriodEndDate = new Date(trialEndDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 14);
      
      daysRemaining = Math.max(0, Math.ceil((gracePeriodEndDate - now) / (1000 * 60 * 60 * 24)));
    }
    
    // Guild is inactive, return specific error with days remaining info
    return res.status(402).json({
      error: 'Guild is inactive',
      code: 'GUILD_INACTIVE',
      message: 'This guild requires an active subscription to access',
      daysRemaining
    });
  } catch (error) {
    console.error('Error checking guild activity:', error);
    // On error, don't block the request but log the error
    return next();
  }
};

module.exports = guildActivityMiddleware;