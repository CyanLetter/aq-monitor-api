const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Run migrations on startup
async function initDb() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_create_sensor_readings.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migration);
    console.log('Migrations applied successfully');
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDb,
  query: (text, params) => pool.query(text, params),
};
