// Centralizes all security middleware so index.js stays clean.
// Call applySecurityMiddleware(app) once, early in app setup.
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

// General API rate limit.
// This is a single-page app: one authenticated dashboard load fans out into many
// /api requests (auth status, guild membership, guild settings, billing, event data,
// periodic auth re-checks, etc.), so a healthy session legitimately makes hundreds of
// requests in a 15-minute window. The old cap of 100/15min throttled normal usage and,
// once tripped, returned 429 for everything under /api — which the frontend then
// mistook for "user has no guild" and refused to load the dashboard.
//
// Default to a generous per-IP ceiling that still caps abuse, and allow tuning via env.
const API_RATE_LIMIT_MAX = parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 1000;
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count cheap CORS preflights against the budget.
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many requests, please try again later.' }
});

// Tighter limit on auth endpoints to slow down brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// Generates a CSRF token and stores it in the session.
// The frontend must include this token as the X-CSRF-Token header on all
// state-changing requests (POST, PUT, DELETE, PATCH).
const generateCsrfToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

// Validates the CSRF token on state-changing requests.
// Skips the check for the Discord OAuth callback, bot endpoints, and Stripe webhooks
// since those come from external services that can't read our session token.
const validateCsrfToken = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const skipPaths = [
    '/auth/discord/callback',
    '/auth/bot-login',
    '/auth/bot-token',
    '/api/billing/webhook',
    '/oauth/callback'
  ];
  if (skipPaths.some(p => req.path.startsWith(p))) return next();

  const tokenFromHeader = req.headers['x-csrf-token'];
  const tokenFromSession = req.session?.csrfToken;

  if (!tokenFromHeader || !tokenFromSession || tokenFromHeader !== tokenFromSession) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }

  next();
};

const applySecurityMiddleware = (app) => {
  // Security headers (CSP, HSTS, etc.)
  app.use(helmet({
    contentSecurityPolicy: false // Disabled to allow the React frontend to function; tighten per-environment if needed
  }));

  // Rate limiting
  app.use('/api', apiLimiter);
  app.use('/auth', authLimiter);

  // CSRF protection — skipped in development because:
  //   1. The frontend hasn't been updated to send X-CSRF-Token headers yet
  //   2. Cross-origin cookie attacks aren't a real threat on localhost
  // TODO: enable this in production once the frontend sends X-CSRF-Token on all
  //       state-changing requests (fetch /api/csrf-token, store it, attach as header)
  if (process.env.NODE_ENV === 'production') {
    app.use(generateCsrfToken);
    app.use(validateCsrfToken);
  }
};

module.exports = {
  applySecurityMiddleware,
  generateCsrfToken,
  validateCsrfToken,
  apiLimiter,
  authLimiter
};
