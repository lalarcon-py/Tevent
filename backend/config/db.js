// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Create a PostgreSQL connection pool
const pool = process.env.NODE_ENV === 'production' 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'guilddb',
      password: '6384',
      port: 5432
    });

// Log connection status
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
  process.exit(-1);
});

module.exports = pool;