const path = require('path');
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

// Middleware imports
const databaseMiddleware = require('./middleware/databaseMiddleware');
const schemaMiddleware = require('./middleware/schemaMiddleware');
const validateGuildMembership = require('./middleware/guildMembershipMiddleware');
const guildScopeMiddleware = require('./middleware/guildScopeMiddleware');

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
const wishlistRoutes = require('./routes/wishlist');
const userController = require('./controllers/userController');
const SchemaEnforcer = require('./utils/schemaEnforcer');

console.log('Environment Variables Check:', {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
  NODE_ENV: process.env.NODE_ENV
});

const frontendURL = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL 
  : 'http://localhost:3002';

const app = express();
const PORT = process.env.PORT || 8080;

// Database connection check
sequelize.authenticate()
 .then(async () => {
   console.log('Database connected');
   // Verify builds column schema
   const [schemaCheck] = await sequelize.query(`
     SELECT column_name, data_type, udt_name, column_default 
     FROM information_schema.columns 
     WHERE table_name = 'users' 
     AND column_name = 'builds'
   `);
   console.log('Builds column schema:', schemaCheck[0]);
 })
 .then(() => {
   app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
   });
 })
 .catch((error) => {
   console.error('Database connection failed:', error);
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

// Parse JSON bodies
app.use(express.json());

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

// Guild-specific API routes with proper middleware order:
// 1. Membership validation
// 2. Schema selection
// 3. Database connection
// 4. Route handlers

app.use('/api/wishlist', guildScopeMiddleware, validateGuildMembership, wishlistRoutes);
app.use('/api/stats', guildScopeMiddleware, validateGuildMembership, statsRoutes);
app.use('/api/guild-storage', guildScopeMiddleware, validateGuildMembership, guildStorageRouter);
app.use('/api/waitlist', guildScopeMiddleware, validateGuildMembership, waitlistRouter);
app.use('/api/items', guildScopeMiddleware, validateGuildMembership, itemsRouter);
app.use('/api/events', guildScopeMiddleware, validateGuildMembership, eventsRouter);
app.use('/api/teams', guildScopeMiddleware, validateGuildMembership, teamsRouter);
app.use('/api/team-presets', guildScopeMiddleware, validateGuildMembership, teamPresetsRouter);
app.use('/api/dashboard', guildScopeMiddleware, validateGuildMembership, dashboardRouter);

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

// Debug routes
app.use((req, res, next) => {
 if (req.method === 'PUT') {
   console.log('Incoming PUT request:', {
     url: req.url,
     body: req.body,
     params: req.params
   });
 }
 next();
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

// PUT endpoint for updating members with proper validation
app.put('/api/members/:id', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: _, guildId, ...updateData } = req.body;

    // Require a guild ID parameter
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user has permission in this guild
    const userMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });

    if (!userMembership) {
      await t.rollback();
      return res.status(403).json({ error: 'Not authorized in this guild' });
    }

    // Find the member's record to update
    const memberRecord = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: id
      }
    });

    if (!memberRecord) {
      await t.rollback();
      return res.status(404).json({ error: 'Member not found in this guild' });
    }

    // Find the user
    const user = await db.User.findByPk(id);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Member not found' });
    }

    // Format the builds for PostgreSQL
    const buildsJson = JSON.stringify(updateData.builds);

    // Use raw query to ensure proper array handling
    await sequelize.query(
      `UPDATE users SET 
        discord_id = :discord_id,
        username = :username,
        role = :role,
        status = :status,
        avatar_url = :avatar_url,
        builds = :builds::jsonb,
        combat_power = :combat_power,
        updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: { 
          id,
          discord_id: updateData.discordId || updateData.discord_id, // Handle both naming formats
          username: updateData.username,
          role: updateData.role,
          status: updateData.status || 'Active',
          avatar_url: updateData.avatarUrl || updateData.avatar_url, // Handle both naming formats
          builds: JSON.stringify(updateData.builds),
          combat_power: updateData.combat_power || null
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );

    await t.commit();

    // Fetch and return the updated record
    const updatedUser = await db.User.findByPk(id, {
      attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds', 'combat_power']
    });

    console.log('Updated user:', JSON.stringify(updatedUser.toJSON(), null, 2));
    res.json(updatedUser);
   
  } catch (error) {
    console.error('Update error:', {
      message: error.message,
      stack: error.stack,
      sql: error.sql
    });
    if (!t.finished) await t.rollback();
    res.status(500).json({ 
      error: 'Update failed',
      details: error.original?.message || error.message 
    });
  }
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
    
    const user = await db.User.findByPk(id);
    
    userCache.set(id, {
      user,
      timestamp: Date.now()
    });
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Authentication routes
app.get('/auth/discord/callback',
  passport.authenticate('discord', { 
    failureRedirect: '/error', 
    failWithError: true 
  }),
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

app.get('/auth/discord', (req, res, next) => {
  const redirectUrl = req.query.redirectUrl || '';
  const state = Buffer.from(JSON.stringify({ redirectUrl })).toString('base64');
  
  passport.authenticate('discord', { 
    state,
    scope: ['identify', 'guilds']
  })(req, res, next);
});

app.get('/auth/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid');
      return res.redirect(process.env.CLIENT_BASE_URL || 'http://localhost:3002');
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

// UUID validation helper
function validateUUID(uuid) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

module.exports = app;