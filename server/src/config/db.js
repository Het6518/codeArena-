require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
