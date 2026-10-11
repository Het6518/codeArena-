require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  // Connected to PostgreSQL successfully
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
