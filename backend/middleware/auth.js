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

// Middleware to check if a user is authenticated
const authenticateJWT = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Authentication required' });
};

module.exports = {
  generateToken,
  authenticateJWT  // Add this export
};