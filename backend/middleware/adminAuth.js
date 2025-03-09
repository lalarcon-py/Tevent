// backend/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has admin role or admin flag
    // We'll keep this list of admin IDs in environment variables for security
    const adminUserIds = (process.env.ADMIN_USER_IDS || '').split(',');
    
    if (!adminUserIds.includes(req.user.id)) {
      console.warn(`Unauthorized admin access attempt by user: ${req.user.id}`);
      return res.status(403).json({ error: 'Admin access denied' });
    }
    
    // Attach admin flag to request for further use
    req.isAdmin = true;
    next();
  };
  
  module.exports = adminAuth;