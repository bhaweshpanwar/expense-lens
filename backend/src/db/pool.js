const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isCloudOrSsl =
  process.env.NODE_ENV === 'production' ||
  (connectionString && (
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('render.com') ||
    connectionString.includes('railway')
  ));

const pool = new Pool({
  connectionString,
  ssl: isCloudOrSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
