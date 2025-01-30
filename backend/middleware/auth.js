const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

// Example: Sign a token
const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });

// Example: Verify a token
jwt.verify(token, jwtSecret, (err, decoded) => {
  if (err) throw new Error('Invalid token');
  console.log(decoded.userId);
});

// backend/middleware/auth.js
const isOfficer = (req, res, next) => {
  if (req.user.role !== 'Officer' && req.user.role !== 'Guild Master') {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
};