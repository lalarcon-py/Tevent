const path = require('path');
// Start the Discord bot if enabled
try {
  const discordBotPath = path.resolve(__dirname, './discord-bot-starter.js');
  if (process.env.ENABLE_DISCORD_BOT === 'true') {
    require(discordBotPath);
    console.log('Discord bot initialized successfully!');
  } else {
    console.log('Discord bot is disabled via environment variables');
  }
} catch (err) {
  console.error('Error initializing Discord bot:', err.message);
}

require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { sequelize } = require('./config/database');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('./models');
const Joi = require('joi');
const format = require('pg-format');
const pgSession = require('connect-pg-simple')(session);
const crypto = require('crypto');
const supportRoutes = require('./routes/supportRoutes');
const userRoutes = require('./routes/userRoutes');
const gearCheckRoutes = require('./routes/gearCheckRoutes');
const billingRoutes = require('./routes/billingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { createProxyMiddleware } = require('http-proxy-middleware');
const discordRolesRoutes = require('./routes/discordRolesRoutes');
const directMemberDeleteRoutes = require('./routes/directMemberDelete');


const databaseMiddleware = require('./middleware/databaseMiddleware');
const schemaMiddleware = require('./middleware/schemaMiddleware');
const validateGuildMembership = require('./middleware/guildMembershipMiddleware');
const guildScopeMiddleware = require('./middleware/guildScopeMiddleware');
const guildActivityMiddleware = require('./middleware/guildActivityMiddleware');
const guildContextMiddleware = require('./middleware/guildContextMiddleware');

const discordIntegrationRoutes = require('./routes/discordIntegrationRoutes');
const itemsRouter = require('./routes/items');
const eventsRouter = require('./routes/events');
const teamsRouter = require('./routes/teams');
const teamPresetsRouter = require('./routes/teamPresets');
const dashboardRouter = require('./routes/dashboardRoutes');
const guildRouter = require('./routes/guildRoutes');
const waitlistRouter = require('./routes/waitlist');
const guildStorageRouter = require('./routes/guildStorage');
const statsRoutes = require('./routes/statsRoutes');
const guildSettingsRoutes = require('./routes/guildSettings');
const wishlistRoutes = require('./routes/wishlistRoutes');
const userController = require('./controllers/userController');
const { ROLE_HIERARCHY, validateUUID } = require('./utils/helpers');
const { applySecurityMiddleware } = require('./middleware/security');
const SchemaEnforcer = require('./utils/schemaEnforcer');
const staticTeamsRoutes = require('./routes/staticTeamsRoutes');
const rollRoutes = require('./routes/rollRoutes');



const frontendURL = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL 
  : 'http://localhost:3002';

const app = express();
const PORT = process.env.PORT || 8080;

// Detects Chrome on a mobile device from the User-Agent. Centralized here so the
// SameSite/redirect workarounds below all share one definition instead of re-deriving it.
function isChromeOnMobileRequest(req) {
  const userAgent = req.headers['user-agent'] || '';
  return /Chrome/i.test(userAgent) && /Android|iPhone|iPad|iPod/i.test(userAgent);
}

// Chrome sends x-forwarded headers through proxies - fix protocol detection for correct cookie security
function secureProxyMiddleware(req, res, next) {
  // Fix protocol detection for proper cookie security
  if (req.headers['x-forwarded-proto'] === 'https' || 
      req.headers['x-forwarded-ssl'] === 'on' ||
      process.env.NODE_ENV === 'production') {
    req.secure = true;
  }
  next();
}

// Overrides cookie options on Chrome mobile to keep SameSite=none working with cross-origin requests
function chromeCompatibilityMiddleware(req, res, next) {
  if (isChromeOnMobileRequest(req)) {
    // Store the original cookie function
    const originalCookie = res.cookie;
    
    // Override cookie function for Chrome mobile
    res.cookie = function(name, value, options) {
      options = options || {};
      // Ensure SameSite is set properly for Chrome
      if (process.env.NODE_ENV === 'production') {
        options.sameSite = 'none';
        options.secure = true;
      }
      return originalCookie.call(this, name, value, options);
    };
  }
  next();
}

app.use(secureProxyMiddleware);
app.use(chromeCompatibilityMiddleware);

// Start listening immediately — don't gate the server on the DB connection.
// If the DB is down, requests will fail with a clear error rather than the
// process silently refusing connections.
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// Verify the DB connection on startup so problems are obvious in the logs.
sequelize.authenticate()
  .then(() => console.log('Database connection established.'))
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct in backend/.env');
  });

// CORS - only allow requests from our own frontend
app.use(cors({
  origin: frontendURL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-CSRF-Token']
}));

// Session store backed by Postgres so sessions survive restarts
app.use(session({
  store: new pgSession({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    }
  }),
  secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set in production'); return 'dev-only-fallback'; })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.post('/auth/bot-login', (req, res) => {
  try {
    const botSecret = req.body?.botSecret;
    
    if (!botSecret) {
      return res.status(400).json({ 
        error: 'Missing bot secret',
        details: 'botSecret is required in the request body'
      });
    }
    
    // Verify bot secret
    if (botSecret !== process.env.DISCORD_CLIENT_SECRET) {
      return res.status(401).json({ error: 'Invalid bot credentials' });
    }
    
    // Create a bot user session
    req.login({
      id: 'bot-user',
      username: 'Discord Bot',
      role: 'Bot'
    }, (err) => {
      if (err) {
        console.error('Session creation failed:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Bot login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

const jwt = require('jsonwebtoken');

app.post('/auth/bot-token', (req, res) => {
  try {
    const { botSecret } = req.body;
    
    // Verify bot secret
    if (botSecret !== process.env.DISCORD_CLIENT_SECRET) {
      return res.status(401).json({ error: 'Invalid bot credentials' });
    }
    
    // Generate a token instead of using sessions
    const token = jwt.sign(
      { id: 'bot-user', role: 'Bot' },
      process.env.JWT_SECRET || 'bot-fallback-secret',
      { expiresIn: '1h' }
    );
    
    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Bot token error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Dev-only login bypass — never available in production
if (process.env.NODE_ENV !== 'production') {
  app.get('/auth/dev-login', async (req, res) => {
    try {
      const DEV_DISCORD_ID = 'dev-user-local';
      let user = await db.User.findOne({ where: { discord_id: DEV_DISCORD_ID } });

      if (!user) {
        const isFirst = (await db.User.count()) === 0;
        user = await db.User.create({
          discord_id: DEV_DISCORD_ID,
          username: 'DevUser',
          role: isFirst ? 'Guild Master' : 'Member',
          status: 'Active',
          avatar_url: null,
          builds: []
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Dev login failed:', err);
          return res.status(500).send('Dev login failed');
        }
        res.redirect(process.env.FRONTEND_URL || 'http://localhost:3002');
      });
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).send('Dev login error: ' + error.message);
    }
  });
}

app.use(passport.initialize());
app.use(passport.session());
app.use(guildContextMiddleware);

// Security middleware: helmet headers, rate limiting, CSRF protection
applySecurityMiddleware(app);

// Parse JSON bodies - except for Stripe webhook which needs raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

app.delete('/api/user/delete', userController.deleteUser);

app.use('/api/support', supportRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/discord-bot', require('./routes/discordBotRoutes'));
app.use('/api/discord-bot', require('./routes/discordRolePings'));
app.use('/auth', express.json());

// Add guildActivityMiddleware without the problematic billing routes
app.use('/api/billing', billingRoutes);
app.use('/api/discord-setup', require('./routes/discordRoutes'));
// Use new Discord integration routes
app.use('/api', discordIntegrationRoutes);

// Legacy Discord bot routes
app.use('/api/discord', require('./routes/discordBotRoutes'));
app.use(guildActivityMiddleware);


app.use('/api/direct', require('./routes/directDiscordRoles'));

app.use('/api', directMemberDeleteRoutes); // This route contains our hard-delete endpoint for guild members

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/gear-checks', guildScopeMiddleware, validateGuildMembership, gearCheckRoutes);
app.use('/api/wishlist', guildScopeMiddleware, validateGuildMembership, wishlistRoutes);
app.use('/api/stats', guildScopeMiddleware, validateGuildMembership, statsRoutes);
app.use('/api/guild-storage', guildScopeMiddleware, validateGuildMembership, guildStorageRouter);
app.use('/api/waitlist', guildScopeMiddleware, validateGuildMembership, waitlistRouter);
app.use('/api/items', guildScopeMiddleware, validateGuildMembership, itemsRouter);
app.use('/api/events', guildScopeMiddleware, validateGuildMembership, eventsRouter);
app.use('/api/teams', guildScopeMiddleware, validateGuildMembership, teamsRouter);
app.use('/api/team-presets', guildScopeMiddleware, validateGuildMembership, teamPresetsRouter);
app.use('/api/dashboard', guildScopeMiddleware, validateGuildMembership, dashboardRouter);
app.use('/api/guild-applications', guildScopeMiddleware, validateGuildMembership, require('./routes/guildApplicationRoutes'));
app.use('/api/static-teams', guildScopeMiddleware, validateGuildMembership, staticTeamsRoutes);
app.use('/api/guilds', guildScopeMiddleware, rollRoutes); // Register roll routes

const guildSettingsController = require('./controllers/guildSettingsController');

app.get('/api/guilds/:guildId/settings', 
  guildScopeMiddleware,
  validateGuildMembership, 
  guildSettingsController.getGuildSettings
);

app.put('/api/guilds/:guildId/settings', 
  guildScopeMiddleware,
  validateGuildMembership, 
  guildSettingsController.updateGuildSettings
);

// Proxy Discord bot webhook requests to our new standalone Discord bot service
app.use('/api/discord-bot/webhook', createProxyMiddleware({
  target: process.env.DISCORD_BOT_URL || 'http://localhost:3300',
  changeOrigin: true,
  pathRewrite: {
    '^/api/discord-bot/webhook': '/webhook'
  },
  // Add logging to understand what's happening with requests
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to Discord bot: ${req.method} ${req.originalUrl}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Proxy response from Discord bot: ${proxyRes.statusCode} for ${req.originalUrl}`);
  },
  onError: (err, req, res) => {
    console.error(`Proxy error: ${err.message}`);
    res.status(500).json({ error: 'Discord bot service unavailable' });
  }
}));

app.use('/api/guilds/:guildId/members', guildScopeMiddleware, validateGuildMembership, (req, res, next) => {
  const { guildId } = req.params;
  
  db.GuildMember.findAll({
    where: { guild_id: guildId },
    include: [{
      model: db.User,
      attributes: ['id', 'username', 'avatar_url', 'discord_id', 'builds', 'combat_power']
    }],
    order: [
      [sequelize.literal(`CASE 
        WHEN "GuildMember"."role" = 'Guild Master' THEN 1
        WHEN "GuildMember"."role" = 'Guild Advisor' THEN 2
        WHEN "GuildMember"."role" = 'Guild Guardian' THEN 3
        ELSE 4
      END`), 'ASC'],
      ['created_at', 'ASC']
    ]
  })
  .then(members => {
    const formattedMembers = members.map(member => ({
      id: member.User.id,
      username: member.User.username,
      avatarUrl: member.User.avatar_url,
      discordId: member.User.discord_id,
      role: member.role,
      builds: member.User.builds,
      combat_power: member.User.combat_power,
      joinedAt: member.created_at,
      joinedViaInvite: member.joined_via_invite || false
    }));
    
    res.json(formattedMembers);
  })
  .catch(error => {
    console.error('Get guild members error:', error);
    res.status(500).json({ error: 'Failed to fetch guild members' });
  });
});

app.use('/api/guilds', guildScopeMiddleware, guildRouter);

app.get('/api/config/discord', (req, res) => {
  res.json({ 
    clientId: process.env.DISCORD_CLIENT_ID || '1333905158496587816'
  });
});


// Trust exactly one proxy hop in production (e.g. nginx/load balancer).
// In development there's no proxy so we leave it off to keep rate limiting accurate.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// FIXED - Replace the problematic endpoint with a guild-specific version
app.get('/api/members', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Require a guild ID parameter
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // First check if user is a member of this guild
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'Not authorized to view members of this guild' });
    }
    
    // Forward to the guild-specific members endpoint
    const guildMembers = await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'discord_id', 'username', 'status', 'avatar_url', 'builds', 'combat_power']
      }],
      order: [
        [sequelize.literal(`CASE 
          WHEN role = 'Guild Master' THEN 1
          WHEN role = 'Guild Advisor' THEN 2
          WHEN role = 'Guild Guardian' THEN 3
          ELSE 4
        END`), 'ASC']
      ]
    });

    // Format response to match expected format
    const members = guildMembers.map(member => ({
      id: member.User.id,
      discord_id: member.User.discord_id,
      username: member.User.username,
      role: member.role,
      status: member.User.status,
      avatar_url: member.User.avatar_url,
      builds: Array.isArray(member.User.builds) ? member.User.builds : [],
      combat_power: member.User.combat_power
    }));

    res.json(members);
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.get('/oauth/callback', async (req, res) => {
  try {
    const { state, guild_id } = req.query;
    
    if (!state || !guild_id) {
      return res.status(400).send("Missing required parameters");
    }
    
    console.log(`Bot installed to Discord guild: ${guild_id}`);
    
    // Decode state parameter
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      return res.status(400).send("Invalid state parameter");
    }
    
    const { appGuildId, joinCode } = stateData;
    
    if (!appGuildId || !joinCode) {
      return res.status(400).send("Missing guild information in state");
    }
    
    console.log(`Automatically linking: Discord ${guild_id} → App Guild ${appGuildId}`);
    
    // Create the mapping
    try {
      // Get a bot token for authentication
      const authResponse = await axios.post(`${API_URL}/auth/bot-token`, {
        botSecret: process.env.DISCORD_CLIENT_SECRET
      });
      
      // Call the backend to create the mapping
      await axios.post(`${API_URL}/api/discord-bot/link-guild`, {
        discordGuildId: guild_id,
        joinCode: joinCode,
        secret: process.env.BOT_WEBHOOK_SECRET
      }, {
        headers: {
          'Authorization': `Bearer ${authResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL}/guilds/${appGuildId}/dashboard?discord=connected`);
    } catch (error) {
      console.error('Error automatically linking guild:', error);
      res.status(500).send("Failed to complete Discord integration. Please try again or contact support.");
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send("An error occurred during Discord integration");
  }
});

app.put('/api/members/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: _, guildId, role, ...updateData } = req.body;
    
    await sequelize.query(
      `UPDATE users SET 
        discord_id = :discord_id,
        username = :username,
        status = :status,
        avatar_url = :avatar_url,
        builds = :builds::jsonb,
        combat_power = :combat_power,
        updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: { 
          id,
          discord_id: updateData.discordId || updateData.discord_id || '',
          username: updateData.username || '',
          status: updateData.status || 'Active',
          avatar_url: (updateData.avatarUrl || updateData.avatar_url || ''),
          builds: JSON.stringify(updateData.builds || []),
          combat_power: updateData.combat_power || null
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );
    
    if (role) {
      await sequelize.query(
        `UPDATE guild_members SET 
          role = :role,
          updated_at = NOW()
         WHERE user_id = :id AND guild_id = :guildId`,
        {
          replacements: { 
            id,
            guildId,
            role
          },
          type: sequelize.QueryTypes.UPDATE,
          transaction: t
        }
      );
    }
    
    await t.commit();
    
    const memberData = await db.GuildMember.findOne({
      where: {
        user_id: id,
        guild_id: guildId
      },
      attributes: ['role']
    });
    
    const userData = await db.User.findByPk(id);
    
    res.json({
      ...userData.toJSON(),
      role: memberData.role
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// On Chrome mobile, store the redirect URL in session since the state param can get mangled
function discordAuthForChrome(req, res, next) {
  const redirectUrl = req.query.redirectUrl || '';

  if (isChromeOnMobileRequest(req)) {
    // Store redirect URL in session for Chrome mobile
    req.session.chromeRedirectUrl = redirectUrl;
    console.log('Chrome Mobile: Storing redirect URL in session:', redirectUrl);
    
    // Use a simpler state for Chrome
    passport.authenticate('discord', { 
      scope: ['identify', 'guilds']
    })(req, res, next);
  } else {
    // Continue to your existing handler
    next();
  }
}

// Picks up the redirect URL we stashed in session for Chrome mobile
function handleChromeAuthCallback(req, res, next) {
  if (isChromeOnMobileRequest(req) && req.session.chromeRedirectUrl) {
    console.log('Chrome Mobile: Retrieving redirect URL from session');
    
    // Get the user's guild membership
    db.GuildMember.findOne({
      where: { user_id: req.user.id }
    }).then(guildMember => {
      const baseRedirect = req.session.chromeRedirectUrl || 
                          (process.env.FRONTEND_URL || 'http://localhost:3002');
      delete req.session.chromeRedirectUrl;
      
      if (guildMember) {
        res.redirect(`${baseRedirect}/guilds/${guildMember.guild_id}/dashboard`);
      } else {
        res.redirect(`${baseRedirect}/guilds/setup`);
      }
    }).catch(error => {
      console.error('Chrome auth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/error`);
    });
  } else {
    // Continue to your existing callback handler
    next();
  }
}

// Debug route - development only
app.get('/api/debug-auth', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  // Don't reveal sensitive information
  const sessionInfo = req.session ? {
    exists: true,
    authenticated: req.isAuthenticated(),
    cookie: {
      maxAge: req.session.cookie.maxAge,
      expires: req.session.cookie.expires,
      secure: req.session.cookie.secure,
      httpOnly: req.session.cookie.httpOnly,
      sameSite: req.session.cookie.sameSite
    }
  } : 'missing';
  
  res.json({
    userAgent: req.headers['user-agent'],
    secure: req.secure,
    protocol: req.protocol,
    host: req.headers.host,
    origin: req.headers.origin,
    referrer: req.headers.referer,
    cookies: req.cookies ? 'present' : 'missing',
    sessionInfo,
    xForwardedProto: req.headers['x-forwarded-proto'],
    xForwardedFor: req.headers['x-forwarded-for']
  });
});

// Discord OAuth strategy - creates user on first login, updates avatar if needed
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URI,
  scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await db.User.findOne({ where: { discord_id: profile.id } });
    
    if (!user) {
      console.log('Creating new user');
      const defaultBuilds = [];
      user = await db.User.create({
        discord_id: profile.id,
        username: profile.username,
        role: (await db.User.count()) === 0 ? 'Guild Master' : 'Member',
        status: 'Active',
        avatar_url: profile.avatar 
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        builds: defaultBuilds
      });
    }
    
    done(null, user);
  } catch (error) {
    console.error('Auth error:', error.message);
    done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));

const userCache = new Map();
const USER_CACHE_TTL = 60000;
passport.deserializeUser(async (id, done) => {
  try {
    const cachedUser = userCache.get(id);
    if (cachedUser && (Date.now() - cachedUser.timestamp) < USER_CACHE_TTL) {
      return done(null, cachedUser.user);
    }
    
    // Get base user from database
    const user = await db.User.findByPk(id);
    
    if (!user) {
      return done(null, null);
    }
    
    // Find the user's highest role across all guilds
    const guildMemberships = await db.GuildMember.findAll({
      where: { user_id: id }
    });
    
    let highestRole = user.role;
    let highestRoleRank = ROLE_HIERARCHY[user.role] || 0;

    for (const membership of guildMemberships) {
      const membershipRoleRank = ROLE_HIERARCHY[membership.role] || 0;
      if (membershipRoleRank > highestRoleRank) {
        highestRole = membership.role;
        highestRoleRank = membershipRoleRank;
      }
    }
    
    // Create enhanced user object
    const enhancedUser = {
      ...user.toJSON(),
      guildMemberships: guildMemberships.map(m => ({
        guild_id: m.guild_id,
        role: m.role
      })),
      // If highest role from guilds is higher than global role, use it as effective role
      effectiveRole: highestRole
    };
    
    // Cache the enhanced user
    userCache.set(id, {
      user: enhancedUser,
      timestamp: Date.now()
    });
    
    done(null, enhancedUser);
  } catch (error) {
    console.error('User deserialization error:', error);
    done(error, null);
  }
});

// Auth routes
app.get('/auth/discord', discordAuthForChrome, (req, res, next) => {
  const redirectUrl = req.query.redirectUrl || '';
  const state = Buffer.from(JSON.stringify({ redirectUrl })).toString('base64');
  
  passport.authenticate('discord', { 
    state,
    scope: ['identify', 'guilds']
  })(req, res, next);
});

app.get('/auth/discord/callback',
  passport.authenticate('discord', { 
    failureRedirect: '/error', 
    failWithError: true 
  }),
  handleChromeAuthCallback,
  async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.redirect('/error');
      }
      
      // Extract redirectUrl from state parameter
      let redirectUrl = '';
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          redirectUrl = stateData.redirectUrl || '';
        } catch (e) {
          console.error('Failed to parse state:', e);
        }
      }
      
      // Apply fallbacks if needed
      redirectUrl = redirectUrl || 
        (process.env.NODE_ENV === 'production' ? 
          (process.env.FRONTEND_URL || req.headers.origin || req.headers.referer || '/') : 
          'http://localhost:3002');
      
      // Check if user is in any guilds
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id }
      });

      if (guildMember) {
        // User is in a guild, redirect to guild management
        res.redirect(`${redirectUrl}/guilds/${guildMember.guild_id}/dashboard`);
      } else {
        // User is not in a guild, redirect to guild setup page
        res.redirect(`${redirectUrl}/guilds/setup`);
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      const fallbackRedirect = process.env.FRONTEND_URL || '/';
      res.redirect(`${fallbackRedirect}/error`);
    }
  }
);

app.get('/auth/logout', (req, res) => {
  // Get the desired redirect URL
  const redirectUrl = req.query.redirectUrl || 
                      process.env.FRONTEND_URL || 
                      'http://localhost:3002';
  
  // Log the user out of our app
  req.logout(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    
    // Destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      
      // Clear the cookie
      res.clearCookie('connect.sid');
      
      // Simply redirect back to our frontend with a special flag
      res.redirect(`${redirectUrl}?logout=success`);
    });
  });
});

// Alias for /auth/logout - kept for backwards compatibility with clients using this path
app.get('/auth/discord/logout', (req, res) => {
  const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3002';
  res.redirect(`/auth/logout?redirectUrl=${encodeURIComponent(redirectUrl)}`);
});


// Exposes the CSRF token so the frontend can attach it to state-changing requests
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

app.get('/api/auth/status', (req, res) => {
 req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ error: 'Not authenticated' });
});

app.get('/error', (req, res) => {
  // If this is a JSON API request
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(400).json({ error: 'Authentication failed' });
  }
  
  // If production with static frontend
  if (process.env.NODE_ENV === 'production') {
    return res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  }
  
  // In development, redirect to the frontend error page
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth-error`);
});

// Catch-all 404 for API routes - must come before the static file handler
app.all('/api/*', function(req, res) {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Serve the React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}


// Endpoint to remove a member from a guild
app.delete('/api/guilds/:guildId/members/:memberId', async (req, res) => {
  // Start a transaction to ensure all operations happen together
  const t = await sequelize.transaction();
  
  try {
    console.log(`DELETE request received to remove member ${req.params.memberId} from guild ${req.params.guildId}`);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId } = req.params;
    
    // Validate IDs
    if (!validateUUID(guildId) || !validateUUID(memberId)) {
      return res.status(400).json({ error: 'Invalid guild or member ID' });
    }
    
    // Verify requester is a Guild Master of this guild
    const requesterMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      },
      transaction: t
    });
    
    if (!requesterMembership || requesterMembership.role !== 'Guild Master') {
      await t.rollback();
      return res.status(403).json({ 
        error: 'Permission denied', 
        details: 'Only Guild Masters can remove members' 
      });
    }
    
    // Prevent Guild Masters from removing themselves
    if (memberId === req.user.id) {
      await t.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Guild Masters cannot remove themselves from the guild'
      });
    }
    
    // First check if the member exists using raw query
    const [memberCheck] = await sequelize.query(
      `SELECT gm.id, gm.role, u.username 
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    if (!memberCheck) {
      await t.rollback();
      return res.status(404).json({ error: 'Member not found in this guild' });
    }
    
    // Prevent removing other Guild Masters
    if (memberCheck.role === 'Guild Master') {
      await t.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Cannot remove a Guild Master'
      });
    }
    
    console.log(`Found member to remove: ${memberCheck.username}`);
    
    await removeGuildMember(guildId, memberId, t);
    await t.commit();

    console.log(`Member ${memberCheck.username} removed from guild ${guildId}`);
    res.json({
      success: true,
      message: `${memberCheck.username} has been removed from the guild`,
      removedMemberId: memberId
    });
    
  } catch (error) {
    // Rollback the transaction if any operation fails
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error removing guild member:', error);
    res.status(500).json({ error: 'Failed to remove member from guild' });
  }
});

// Add this endpoint to directly remove a member when the normal endpoint isn't working
app.post('/api/direct-member-delete', async (req, res) => {
  // Start a transaction to ensure all operations happen together
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId, forceDirect } = req.body;
    
    if (!forceDirect) {
      await t.rollback();
      return res.status(400).json({ error: 'Direct deletion not allowed without force flag' });
    }
    
    // Verify requester is a Guild Master of this guild
    const requesterMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'
      },
      transaction: t
    });
    
    if (!requesterMembership) {
      await t.rollback();
      return res.status(403).json({ error: 'Only Guild Masters can perform this operation' });
    }
    
    // First check if the member exists and get their info for logging
    const [memberCheck] = await sequelize.query(
      `SELECT gm.id, gm.role, u.username 
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId AND gm.user_id != :requesterId`,
      {
        replacements: { 
          guildId, 
          memberId,
          requesterId: req.user.id  // Prevent self-deletion
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    // Self-deletion guard: run cleanup only if the member is not the requester
    if (memberId === req.user.id) {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot remove yourself via this endpoint' });
    }

    await removeGuildMember(guildId, memberId, t);
    await t.commit();

    const username = memberCheck ? memberCheck.username : 'Unknown user';
    console.log(`Direct delete successful: Removed ${username} from guild ${guildId}`);
    res.json({
      success: true,
      message: memberCheck ? `${username} has been removed from the guild` : 'Member removed'
    });
    
  } catch (error) {
    // Rollback the transaction if any operation fails
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Direct member deletion error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

const rollScheduler = require('./utils/rollScheduler');
const membershipCleanup = require('./utils/membershipCleanup');
const { removeGuildMember } = require('./utils/membershipCleanup');
const { checkDuplicateMembers, cleanupSoftDeletedMembers } = require('./jobs/checkDuplicateMembers');

rollScheduler.checkForExpiredRequests()
  .then(() => console.log('Initial roll check completed'))
  .catch(err => console.error('Error in initial roll check:', err));

// Then set up the regular intervals
const rollInterval = setInterval(() => {
  console.log('Running scheduled roll check...');
  rollScheduler.checkForExpiredRequests()
    .then(result => console.log('Roll check completed:', result || 'No expired requests'))
    .catch(err => console.error('Error in roll check:', err));
}, 60000); // Check every minute

// Run membership cleanup less frequently - every 30 minutes
const membershipCleanupInterval = setInterval(() => {
  console.log('Running scheduled membership cleanup...');
  membershipCleanup.runMembershipCleanup()
    .then(result => console.log('Membership cleanup completed:', result))
    .catch(err => console.error('Error in membership cleanup:', err));
}, 30 * 60000); // Check every 30 minutes

// Run duplicate member check every hour
const duplicateMemberInterval = setInterval(() => {
  console.log('Running scheduled duplicate member check...');
  checkDuplicateMembers()
    .then(result => console.log('Duplicate member check completed:', result || 'No duplicates found'))
    .catch(err => console.error('Error in duplicate member check:', err));
  
  // Also clean up any soft-deleted members
  cleanupSoftDeletedMembers()
    .then(result => console.log('Soft-deleted member cleanup completed:', result || 'No soft-deleted members found'))
    .catch(err => console.error('Error in soft-deleted member cleanup:', err));
}, 60 * 60000); // Check every hour

// Also run membership cleanup and duplicate member check once on startup
membershipCleanup.runMembershipCleanup()
  .then(() => console.log('Initial membership cleanup completed'))
  .catch(err => console.error('Error in initial membership cleanup:', err));

checkDuplicateMembers()
  .then(() => console.log('Initial duplicate member check completed'))
  .catch(err => console.error('Error in initial duplicate member check:', err));

cleanupSoftDeletedMembers()
  .then(() => console.log('Initial soft-deleted member cleanup completed'))
  .catch(err => console.error('Error in initial soft-deleted member cleanup:', err));

// Clean up intervals on shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down scheduled tasks...');
  clearInterval(rollInterval);
  clearInterval(membershipCleanupInterval);
  clearInterval(duplicateMemberInterval);
});



// Global error handler — must be the last app.use() call so it catches errors
// from all routes and middleware registered above
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;