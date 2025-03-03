const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { sequelize } = require('./config/database');
const itemsRouter = require('./routes/items');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('./models');
const Joi = require('joi');
const format = require('pg-format');
const eventsRouter = require('./routes/events');
const teamsRouter = require('./routes/teams');
const teamPresetsRouter = require('./routes/teamPresets');
const dashboardRouter = require('./routes/dashboardRoutes');
const pgSession = require('connect-pg-simple')(session);
const databaseMiddleware = require('./middleware/databaseMiddleware');
const schemaMiddleware = require('./middleware/schemaMiddleware');
const guildRouter = require('./routes/guildRoutes');
const waitlistRouter = require('./routes/waitlist');
const guildStorageRouter = require('./routes/guildStorage');
const statsRoutes = require('./routes/statsRoutes');
const guildSettingsRoutes = require('./routes/guildSettings');
const wishlistRoutes = require('./routes/wishlist');
const waitlistRoutes = require('./routes/waitlist');
const guildStorageRoutes = require('./routes/guildStorage');
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

// Middleware
app.use(cors({
  origin: frontendURL, // Make sure this matches exactly (http://localhost:3002)
  credentials: true,   // This is critical
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



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



app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(schemaMiddleware);
app.delete('/api/user/delete', userController.deleteUser);
app.use('/api/wishlist', databaseMiddleware, wishlistRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/guild-storage', databaseMiddleware, guildStorageRouter);
app.use('/api/guilds', guildRouter);
app.use('/api/guilds', guildSettingsRoutes);
app.use('/api/waitlist', databaseMiddleware, waitlistRouter);
app.use('/api/items', databaseMiddleware, itemsRouter);
app.use('/api/events', databaseMiddleware, eventsRouter);
app.use('/api/teams', databaseMiddleware, teamsRouter);
app.use('/api/team-presets', databaseMiddleware, teamPresetsRouter);

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

app.get('/api/members', async (req, res) => {
 if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

 try {
   const members = await db.User.findAll({
     raw: true,
     attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds', 'combat_power'], // Added combat_power here
     order: [['role', 'DESC'], ['username', 'ASC']]
   });

   res.json(members.map(m => ({
     ...m,
     builds: Array.isArray(m.builds) ? m.builds : []
   })));
 } catch (error) {
   console.error('Fetch members error:', error);
   res.status(500).json({ error: 'Failed to fetch members' });
 }
});

app.put('/api/members/:id', async (req, res) => {
 if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

 const t = await sequelize.transaction();
 try {
   const { id } = req.params;
   const { id: _, ...updateData } = req.body;

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
         discord_id: updateData.discord_id,
         username: updateData.username,
         role: updateData.role,
         status: updateData.status,
         avatar_url: updateData.avatar_url,
         builds: JSON.stringify(updateData.builds),
         combat_power: updateData.combat_power || null // Added this line
       },
       type: sequelize.QueryTypes.UPDATE,
       transaction: t
     }
   );

   await t.commit();

   // Fetch and return the updated record
   const updatedUser = await db.User.findByPk(id, {
     attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds', 'combat_power'] // Added combat_power
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

// Error route
app.get('/error', (req, res) => {
  // If this is a JSON API request
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(400).json({ error: 'Authentication failed' });
  }
  
  // If production with static frontend
  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    return res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  }
  
  // In development, redirect to the frontend error page
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth-error`);
});

// Static file serving in production - moved to end of file before catch-all
if (process.env.NODE_ENV === 'production') {
 const path = require('path');
 app.use(express.static(path.join(__dirname, '../frontend/build')));

 app.get('*', function(req, res) {
   res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
 });
}

// UUID validation helper
function validateUUID(uuid) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}