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

module.exports = {
  generateToken,
};