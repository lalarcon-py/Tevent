const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;

// Middleware to generate a token
const generateToken = (user) => {
  if (!user || !user.id) {
    throw new Error('User object is missing or invalid');
  }
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
  // Check for Discord authentication first
  if (req.isAuthenticated()) {
    return next();
  }

  // If not Discord authenticated, check for JWT
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirectUrl: '/auth/discord'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      redirectUrl: '/auth/discord'
    });
  }
};

// Role-based middleware (if you need it)
const isOfficer = (req, res, next) => {
  if (!req.user || !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = {
  generateToken,
  authMiddleware,
  isOfficer
};