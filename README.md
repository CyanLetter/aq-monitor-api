# Air Quality API

Backend API server for receiving and storing sensor data from ENS160 air quality sensor on Raspberry Pi Pico W.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Railway)

### Local Development

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL locally (using Docker):
   ```bash
   docker run --name air-quality-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=air_quality -p 5432:5432 -d postgres:15
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your settings:
   ```
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/air_quality
   API_KEY=your-dev-api-key
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### POST /api/sensors
Submit sensor readings from the Pico W device.

**Headers:**
- `X-API-Key: <your-api-key>` (required)
- `Content-Type: application/json`

**Request:**
```json
{
  "temperature_c": 22.50,
  "temperature_f": 72.50,
  "humidity_percent": 45.20,
  "pressure_hpa": 1013.25,
  "eco2": 400,
  "tvoc": 0,
  "aqi": 1
}
```

**Response:** `201 Created`
```json
{
  "id": 123,
  "recorded_at": "2025-01-13T12:00:00.000Z"
}
```

### GET /api/sensors
Query sensor readings.

**Query Parameters:**
- `limit` - Max results (default: 100, max: 1000)
- `since` - ISO date to filter from
- `device_id` - Filter by device

**Response:**
```json
[
  {
    "id": 123,
    "recorded_at": "2025-01-13T12:00:00.000Z",
    "temperature_c": 22.50,
    ...
  }
]
```

### GET /api/sensors/latest
Get most recent reading.

### GET /health
Health check endpoint.

## Railway Deployment

1. Push to GitHub
2. Create new Railway project
3. Add PostgreSQL plugin (auto-sets DATABASE_URL)
4. Connect GitHub repo
5. Set environment variables:
   - `API_KEY` - Generate a secure random string
6. Deploy

## Testing

```bash
# Submit a reading
curl -X POST http://localhost:3000/api/sensors \
  -H "X-API-Key: your-dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"temperature_c":22.5,"temperature_f":72.5,"humidity_percent":45.2,"pressure_hpa":1013.25,"eco2":400,"tvoc":0,"aqi":1}'

# Get latest reading
curl http://localhost:3000/api/sensors/latest

# Get all readings
curl http://localhost:3000/api/sensors
```
