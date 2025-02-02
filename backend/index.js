require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const sequelize = require('./config/database');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('./models');
const multer = require('multer'); // For handling file uploads
const { exec } = require('child_process'); // To execute Python scripts
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['set-cookie']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Authentication Middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Role-Based Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Passport Discord Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URI,
  scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await db.User.findOne({
      where: { discord_id: profile.id },
      attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds']
    });

    if (!user) {
      user = await db.User.create({
        discord_id: profile.id,
        username: profile.username,
        role: (await db.User.count()) === 0 ? 'Guild Master' : 'Member',
        status: 'Active',
        avatar_url: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
        builds: []
      });
    }

    console.log('Authenticated user:', user.toJSON());
    done(null, user);
  } catch (error) {
    console.error('Auth error:', error);
    done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    // Explicitly select all fields from users table
    const user = await sequelize.query(
      'SELECT * FROM users WHERE id = :id',
      {
        replacements: { id: id },
        type: sequelize.QueryTypes.SELECT,
        raw: true
      }
    );
    
    console.log('User data from database:', user[0]);
    done(null, user[0]);
  } catch (error) {
    console.error('Deserialize error:', error);
    done(error, null);
  }
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// Routes
app.get('/', (req, res) => res.send('Backend server is running!'));

// Discord Authentication Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => res.redirect(`${process.env.CLIENT_BASE_URL}/guild-management`)
);

// Logout Route
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect(process.env.CLIENT_BASE_URL);
  });
});

// API Routes
app.get('/api/auth/status', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get fresh user data from database
    const userData = await sequelize.query(
      'SELECT * FROM users WHERE id = :id',
      {
        replacements: { id: req.user.id },
        type: sequelize.QueryTypes.SELECT,
        raw: true
      }
    );

    console.log('Fresh user data from database:', userData[0]);
    res.json(userData[0]);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

app.get('/api/members', ensureAuthenticated, async (req, res) => {
  try {
    const members = await db.User.findAll({
      raw: true,
      attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds'],
      order: [['role', 'DESC'], ['username', 'ASC']]
    });
    res.json(members.map(member => ({
      ...member,
      builds: Array.isArray(member.builds) ? member.builds : []
    })));
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.put('/api/members/:id', ensureAuthenticated, async (req, res) => {
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

    // Update the user
    await sequelize.query(
      `UPDATE users SET 
        discord_id = :discord_id,
        username = :username,
        role = :role,
        status = :status,
        avatar_url = :avatar_url,
        builds = ARRAY[:builds]::jsonb[],
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
          builds: buildsJson
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );

    await t.commit();

    // Fetch and return the updated record
    const updatedUser = await db.User.findByPk(id, {
      attributes: ['id', 'discord_id', 'username', 'role', 'status', 'avatar_url', 'builds']
    });
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

// Gear Submission Routes
const upload = multer({ dest: 'uploads/' }); // Store uploaded files in the 'uploads/' directory

app.post('/api/gear/submit', ensureAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`; // Adjust as needed

    await sequelize.query(
      `INSERT INTO gear_submissions (user_id, image_url, status) VALUES (:userId, :imageUrl, 'pending')`,
      {
        replacements: { userId, imageUrl }
      }
    );
    res.json({ message: 'Gear submission successful!' });
  } catch (error) {
    console.error('Error submitting gear:', error);
    res.status(500).json({ error: 'Failed to submit gear' });
  }
});

app.put('/api/gear/review/:id', authorizeRoles('Guild Master', 'Advisor', 'Officer'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await sequelize.query(
      `UPDATE gear_submissions SET status = :status, reviewed_by = :reviewerId, updated_at = NOW() WHERE id = :id`,
      {
        replacements: { status, reviewerId: req.user.id, id }
      }
    );
    res.json({ message: 'Gear review updated successfully!' });
  } catch (error) {
    console.error('Error reviewing gear:', error);
    res.status(500).json({ error: 'Failed to update gear review' });
  }
});

app.get('/api/gear/pending', authorizeRoles('Guild Master', 'Advisor', 'Officer'), async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `SELECT gs.*, u.username AS submitted_by 
       FROM gear_submissions gs 
       JOIN users u ON gs.user_id = u.id 
       WHERE gs.status = 'pending'`
    );
    res.json(results);
  } catch (error) {
    console.error('Error fetching pending gear submissions:', error);
    res.status(500).json({ error: 'Failed to fetch pending gear submissions' });
  }
});

// Database Connection Check
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

// UUID Validation Helper
function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}