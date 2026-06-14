const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;

// Wraps a user into a signed JWT - mainly used for the bot auth flow
const generateToken = (user) => {
  if (!user || !user.id) {
    throw new Error('Invalid user object passed to generateToken');
  }
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });
};

// Drop-in Express middleware that rejects unauthenticated requests
const authenticateJWT = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
};

module.exports = {
  generateToken,
  authenticateJWT
};
