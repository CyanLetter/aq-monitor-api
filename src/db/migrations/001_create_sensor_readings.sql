-- Create sensor_readings table if it doesn't exist
CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    temperature_c REAL NOT NULL,
    temperature_f REAL NOT NULL,
    humidity_percent REAL NOT NULL,
    pressure_hpa REAL NOT NULL,
    eco2 INTEGER NOT NULL,
    tvoc INTEGER NOT NULL,
    aqi SMALLINT NOT NULL,
    device_id VARCHAR(50) DEFAULT 'pico-w-1'
);

-- Create index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON sensor_readings(recorded_at DESC);
