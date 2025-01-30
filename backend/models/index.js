require('dotenv').config(); 
const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Guild Management API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', // Explicitly specify PostgreSQL
    dialectOptions: {
      ssl: false, // Set to `true` if using a cloud database with SSL
    },
  });

// Test the connection
sequelize.authenticate()
  .then(() => console.log('Connected to PostgreSQL!'))
  .catch(err => console.error('Connection error:', err));