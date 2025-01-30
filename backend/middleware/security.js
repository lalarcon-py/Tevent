const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

const securityMiddleware = (app) => {
  // Security headers
  app.use(helmet());
  
  // Data sanitization
  app.use(xss());
  app.use(mongoSanitize());
  
  // Rate limiting
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
  }));
};

module.exports = securityMiddleware;