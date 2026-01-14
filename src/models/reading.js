const db = require('../db');

async function createReading(data) {
  const {
    temperature_c,
    temperature_f,
    humidity_percent,
    pressure_hpa,
    eco2,
    tvoc,
    aqi,
    device_id = 'pico-w-1',
  } = data;

  const result = await db.query(
    `INSERT INTO sensor_readings
     (temperature_c, temperature_f, humidity_percent, pressure_hpa, eco2, tvoc, aqi, device_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, recorded_at`,
    [temperature_c, temperature_f, humidity_percent, pressure_hpa, eco2, tvoc, aqi, device_id]
  );

  return result.rows[0];
}

async function getReadings({ limit = 100, since = null, device_id = null } = {}) {
  let query = 'SELECT * FROM sensor_readings WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (since) {
    query += ` AND recorded_at >= $${paramIndex}`;
    params.push(since);
    paramIndex++;
  }

  if (device_id) {
    query += ` AND device_id = $${paramIndex}`;
    params.push(device_id);
    paramIndex++;
  }

  query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await db.query(query, params);
  return result.rows;
}

async function getLatestReading(device_id = null) {
  let query = 'SELECT * FROM sensor_readings';
  const params = [];

  if (device_id) {
    query += ' WHERE device_id = $1';
    params.push(device_id);
  }

  query += ' ORDER BY recorded_at DESC LIMIT 1';

  const result = await db.query(query, params);
  return result.rows[0] || null;
}

module.exports = {
  createReading,
  getReadings,
  getLatestReading,
};
