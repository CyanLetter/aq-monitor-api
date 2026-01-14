const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../middleware/auth');
const { createReading, getReadings, getLatestReading } = require('../models/reading');

// Validate sensor data payload
function validatePayload(data) {
  const required = ['temperature_c', 'temperature_f', 'humidity_percent', 'pressure_hpa', 'eco2', 'tvoc', 'aqi'];
  const missing = required.filter(field => data[field] === undefined);

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Type validation
  if (typeof data.eco2 !== 'number' || typeof data.tvoc !== 'number' || typeof data.aqi !== 'number') {
    return { valid: false, error: 'eco2, tvoc, and aqi must be numbers' };
  }

  if (data.aqi < 1 || data.aqi > 5) {
    return { valid: false, error: 'aqi must be between 1 and 5' };
  }

  return { valid: true };
}

// POST /api/sensors - Receive sensor data from Pico W
router.post('/', validateApiKey, async (req, res, next) => {
  try {
    const validation = validatePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await createReading(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/sensors - Query sensor readings
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, since, device_id } = req.query;
    const readings = await getReadings({
      limit: Math.min(parseInt(limit, 10) || 100, 1000),
      since: since ? new Date(since) : null,
      device_id,
    });
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

// GET /api/sensors/latest - Get most recent reading
router.get('/latest', async (req, res, next) => {
  try {
    const { device_id } = req.query;
    const reading = await getLatestReading(device_id);

    if (!reading) {
      return res.status(404).json({ error: 'No readings found' });
    }

    res.json(reading);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
