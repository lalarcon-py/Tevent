require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const sequelize = require('./config/database');
const itemsRouter = require('./routes/items');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('./models');
console.log('DB object contains:', Object.keys(db));
console.log('MemberBuild model:', db.MemberBuild);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_BASE_URL,
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/items', itemsRouter);

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Passport Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI,
    scope: ['identify', 'guilds']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userCount = await db.User.count();
      
      let user = await db.User.findOne({
        where: { discord_id: profile.id }
      });

      if (!user) {
        const now = new Date();
        user = await db.User.create({
          discord_id: profile.id,
          username: profile.username,
          role: userCount === 0 ? 'Guild Master' : 'Member',
          status: 'Active',
          avatar_url: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
          created_at: now,
          updated_at: now
        }, {
          raw: true,
          returning: true,
          fields: [
            'discord_id',
            'username',
            'role',
            'status',
            'avatar_url',
            'created_at',
            'updated_at'
          ]
        });

        console.log('Created user with data:', user.toJSON());
      }

      return done(null, user);
    } catch (error) {
      console.error('Creation error:', {
        message: error.message,
        name: error.name,
        sql: error.sql,
        parameters: error.parameters,
        detail: error.parent?.detail
      });
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
  passport.authenticate('discord', {
    failureRedirect: '/login'
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_BASE_URL}/guild-management`);
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.redirect(process.env.CLIENT_BASE_URL);
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.get('/api/members', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    console.log('Starting members fetch...');
    
    const members = await db.User.findAll({
      attributes: [
        'id',
        'discord_id',
        'username',
        'role',
        'status',
        'avatar_url',
        'builds',
        'created_at',
        'updated_at'
      ],
      order: [
        ['role', 'DESC'],
        ['username', 'ASC']
      ]
    });
    
    console.log('Members fetch successful:', members.length);
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members: ' + error.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Received update request for member:', id);
    console.log('Update data:', updateData);

    const member = await db.User.findByPk(id);
    if (!member) {
      await t.rollback();
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update member data including builds
    await member.update({
      status: updateData.status,
      role: updateData.role,
      discord_id: updateData.discord_id,
      username: updateData.username,
      avatar_url: updateData.avatar_url,
      builds: updateData.builds?.map(build => ({
        primary_weapon: build.primary,
        secondary_weapon: build.secondary,
        combat_role: build.spec
      })) || [],
      updated_at: new Date()
    }, { transaction: t });

    await t.commit();

    console.log('Successfully updated member:', member);
    res.json(member);
  } catch (error) {
    await t.rollback();
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member: ' + error.message });
  }
});



// Start the server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });