require('dotenv').config();
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
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_BASE_URL
    : 'http://localhost:3002',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(session({
  store: new pgSession({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
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

app.use('/api/items', itemsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/team-presets', teamPresetsRouter);
app.use('/api', dashboardRouter);

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
      }, {
        fields: ['discord_id', 'username', 'role', 'status', 'avatar_url', 'builds']
      });
    }
    
    done(null, user);
  } catch (error) {
    console.error('Auth error:', error);
    done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
 try {
   const user = await db.User.findByPk(id);
   done(null, user);
 } catch (error) {
   done(error, null);
 }
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  (req, res, next) => {
    console.log('Hitting callback route');
    next();
  },
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('Authentication successful');
    res.redirect(`${process.env.CLIENT_BASE_URL}/guild-management`);
  }
);

app.get('/auth/logout', (req, res) => {
 req.logout((err) => {
   res.redirect(process.env.CLIENT_BASE_URL);
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
       builds = ARRAY[:builds]::jsonb[],
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
         builds: buildsJson,
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

// Remove this line since it conflicts with frontend routing
// app.get('/', (req, res) => res.send('Backend server is running!'));

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