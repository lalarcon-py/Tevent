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


// Middleware imports
const databaseMiddleware = require('./middleware/databaseMiddleware');
const schemaMiddleware = require('./middleware/schemaMiddleware');
const validateGuildMembership = require('./middleware/guildMembershipMiddleware');
const guildScopeMiddleware = require('./middleware/guildScopeMiddleware');
const guildActivityMiddleware = require('./middleware/guildActivityMiddleware');
const guildContextMiddleware = require('./middleware/guildContextMiddleware');

// Route imports
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
const SchemaEnforcer = require('./utils/schemaEnforcer');
const staticTeamsRoutes = require('./routes/staticTeamsRoutes');



const frontendURL = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL 
  : 'http://localhost:3002';

const app = express();
const PORT = process.env.PORT || 8080;

// New function for Chrome mobile compatibility
function secureProxyMiddleware(req, res, next) {
  // Fix protocol detection for proper cookie security
  if (req.headers['x-forwarded-proto'] === 'https' || 
      req.headers['x-forwarded-ssl'] === 'on' ||
      process.env.NODE_ENV === 'production') {
    req.secure = true;
  }
  next();
}

// New function for Chrome cookie handling
function chromeCompatibilityMiddleware(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const isChromeOnMobile = /Chrome/i.test(userAgent) && 
                          /Android|iPhone|iPad|iPod/i.test(userAgent);
  
  if (isChromeOnMobile) {
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

// Apply new middleware
app.use(secureProxyMiddleware);
app.use(chromeCompatibilityMiddleware);

// Database connection check
sequelize.authenticate()
 .then(async () => {
   // Verify builds column schema
   const [schemaCheck] = await sequelize.query(`
     SELECT column_name, data_type, udt_name, column_default 
     FROM information_schema.columns 
     WHERE table_name = 'users' 
     AND column_name = 'builds'
   `);
 })
 .then(() => {
   app.listen(PORT, () => {
   });
 })
 .catch((error) => {
 });

// CORS Middleware
app.use(cors({
  origin: frontendURL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

// Session Middleware
app.use(session({
  store: new pgSession({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    }
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.post('/auth/bot-login', (req, res) => {
  console.log('Bot login attempt received');
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  
  try {
    // Use a more defensive approach
    const botSecret = req.body?.botSecret;
    console.log('Bot secret received:', botSecret ? '✓' : '✗');
    
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
        return res.status(500).json({ error: 'Session creation failed', details: err.message });
      }
      
      res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Bot login error:', error);
    res.status(500).json({ 
      error: 'Authentication failed', 
      details: error.message
    });
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

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Authentication middlewares
app.use(passport.initialize());
app.use(passport.session());
app.use(guildContextMiddleware);

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create guildMembershipMiddleware if it doesn't exist yet
if (!validateGuildMembership) {
  const validateGuildMembership = async (req, res, next) => {
    // Extract guild ID from various possible sources
    const guildId = req.params.guildId || req.query.guildId || req.body.guildId;
    
    // Skip validation if no guild ID or not authenticated
    if (!guildId || !req.isAuthenticated()) {
      return next();
    }
    
    try {
      // Check if user is a member of this guild
      const membership = await db.GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: req.user.id
        }
      });
      
      if (!membership) {
        return res.status(403).json({ 
          error: 'Not a member of this guild',
          details: 'You must be a member of this guild to access this resource'
        });
      }
      
      // Add membership info to request for potential role-based checks later
      req.guildMembership = membership;
      next();
    } catch (error) {
      console.error('Guild membership check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Non-guild specific routes
app.delete('/api/user/delete', userController.deleteUser);

// User support
app.use('/api/support', supportRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/discord-bot', require('./routes/discordBotRoutes'));
app.use('/api/discord-bot', require('./routes/discordRolePings'));
app.use('/auth', express.json());

// Add guildActivityMiddleware without the problematic billing routes
app.use('/api/billing', billingRoutes);
app.use('/api/discord-setup', require('./routes/discordRoutes'));
app.use('/api/discord', require('./routes/discordBotRoutes'));
app.use(guildActivityMiddleware);


// General use routes
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

app.use('/api/discord-bot', createProxyMiddleware({
  target: 'http://heartfelt-sparkle.railway.internal:3300',
  changeOrigin: true,
  pathRewrite: {
    '^/api/discord-bot': ''
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
    res.status(500).json({ error: 'Failed to fetch guild members', details: error.message });
  });
});

app.use('/api/guilds', guildScopeMiddleware, guildRouter);

app.get('/api/config/discord', (req, res) => {
  res.json({ 
    clientId: process.env.DISCORD_CLIENT_ID || '1333905158496587816'
  });
});


app.enable('trust proxy');

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

// New function for Chrome-specific auth handling
function discordAuthForChrome(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const isChromeOnMobile = /Chrome/i.test(userAgent) && 
                          /Android|iPhone|iPad|iPod/i.test(userAgent);
  const redirectUrl = req.query.redirectUrl || '';
  
  if (isChromeOnMobile) {
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

// New function for Chrome auth callback handling
function handleChromeAuthCallback(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const isChromeOnMobile = /Chrome/i.test(userAgent) && 
                          /Android|iPhone|iPad|iPod/i.test(userAgent);
  
  if (isChromeOnMobile && req.session.chromeRedirectUrl) {
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

// Add debug route
app.get('/api/debug-auth', (req, res) => {
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

// Passport Discord Strategy
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
    console.error('Auth error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql
    });
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
    
    // Role hierarchy for comparison
    const roleHierarchy = {
      'Guild Master': 4,
      'Guild Advisor': 3,
      'Guild Guardian': 2,
      'Guild Member': 1,
      'Member': 1
    };
    
    let highestRole = user.role;
    let highestRoleRank = roleHierarchy[user.role] || 0;
    
    // Find highest role across all guild memberships
    for (const membership of guildMemberships) {
      const membershipRoleRank = roleHierarchy[membership.role] || 0;
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

// Authentication routes - Apply Chrome-specific handling
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

app.get('/auth/discord/logout', (req, res) => {
  // Get redirect URL from query params
  const redirectUrl = req.query.redirectUrl || (process.env.CLIENT_BASE_URL || 'http://localhost:3002');
  
  // Log out the user from our application
  req.logout(err => {
    if (err) {
      console.error('Discord logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    // Destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      
      // Clear cookies
      res.clearCookie('connect.sid');
      
      const discordLogoutUrl = `https://discord.com/api/oauth2/token/revoke`;
      res.redirect(`${discordLogoutUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`);
    });
  });
});

app.get('/api/auth/status', (req, res) => {
 req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ error: 'Not authenticated' });
});

// Error route
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

// Static file serving in production
if (process.env.NODE_ENV === 'production') {
 app.use(express.static(path.join(__dirname, '../frontend/build')));

 app.get('*', function(req, res) {
   res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
 });
}


app.delete('/api/guilds/:guildId/members/:memberId', async (req, res) => {
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
      }
    });
    
    if (!requesterMembership || requesterMembership.role !== 'Guild Master') {
      return res.status(403).json({ 
        error: 'Permission denied', 
        details: 'Only Guild Masters can remove members' 
      });
    }
    
    // Prevent Guild Masters from removing themselves
    if (memberId === req.user.id) {
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Guild Masters cannot remove themselves from the guild'
      });
    }
    
    // Use raw SQL for better debugging
    console.log('Searching for member to remove...');
    
    // First check if the member exists using raw query
    const [memberCheck] = await sequelize.query(
      `SELECT gm.id, gm.role, u.username 
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!memberCheck) {
      return res.status(404).json({ error: 'Member not found in this guild' });
    }
    
    // Prevent removing other Guild Masters
    if (memberCheck.role === 'Guild Master') {
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Cannot remove a Guild Master'
      });
    }
    
    console.log(`Found member to remove: ${memberCheck.username}`);
    
    // Delete using raw SQL to ensure it works
    const deleteResult = await sequelize.query(
      `DELETE FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE
      }
    );
    
    console.log('Delete operation result:', deleteResult);
    
    // Return success with username from the check we did earlier
    res.json({ 
      success: true, 
      message: `${memberCheck.username} has been removed from the guild`,
      removedMemberId: memberId
    });
    
  } catch (error) {
    console.error('Error removing guild member:', error);
    res.status(500).json({ error: 'Failed to remove member from guild' });
  }
});

// Add this endpoint to directly remove a member when the normal endpoint isn't working
app.post('/api/direct-member-delete', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId, forceDirect } = req.body;
    
    if (!forceDirect) {
      return res.status(400).json({ error: 'Direct deletion not allowed without force flag' });
    }
    
    // Verify requester is a Guild Master of this guild
    const requesterMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'
      }
    });
    
    if (!requesterMembership) {
      return res.status(403).json({ error: 'Only Guild Masters can perform this operation' });
    }
    
    // Use raw SQL to ensure deletion works
    const deleteResult = await sequelize.query(
      `DELETE FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :memberId 
       AND user_id != :requesterId`,
      {
        replacements: { 
          guildId, 
          memberId,
          requesterId: req.user.id  // Prevent self-deletion
        },
        type: sequelize.QueryTypes.DELETE
      }
    );
    
    console.log('Direct delete result:', deleteResult);
    
    res.json({ 
      success: true, 
      message: 'Member removed with direct database operation',
      affected: deleteResult[1] // Number of rows affected
    });
    
  } catch (error) {
    console.error('Direct member deletion error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

const rollScheduler = require('./utils/rollScheduler');

rollScheduler.checkForExpiredRequests()
  .then(() => console.log('Initial roll check completed'))
  .catch(err => console.error('Error in initial roll check:', err));

// Then set up the regular interval
const rollInterval = setInterval(() => {
  console.log('Running scheduled roll check...');
  rollScheduler.checkForExpiredRequests()
    .then(result => console.log('Roll check completed:', result || 'No expired requests'))
    .catch(err => console.error('Error in roll check:', err));
}, 60000); // Check every minute

// Clean up interval on shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down roll scheduler...');
  clearInterval(rollInterval);
});


// UUID validation helper
function validateUUID(uuid) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

module.exports = app;