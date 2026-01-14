// Air Quality Dashboard

const API_BASE = '/api/sensors';

// Set default date range (last 24 hours)
function initDateInputs() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  document.getElementById('date-end').value = now.toISOString().split('T')[0];
  document.getElementById('date-start').value = yesterday.toISOString().split('T')[0];
}

// Fetch sensor data from API
async function fetchData(since, until) {
  const params = new URLSearchParams({ limit: 1000 });
  if (since) params.append('since', since);

  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) throw new Error('Failed to fetch data');

  let data = await response.json();

  // Filter by end date if specified
  if (until) {
    const untilDate = new Date(until + 'T23:59:59');
    data = data.filter(d => new Date(d.recorded_at) <= untilDate);
  }

  return data;
}

// Fetch latest reading
async function fetchLatest() {
  const response = await fetch(`${API_BASE}/latest`);
  if (!response.ok) return null;
  return response.json();
}

// Create Vega spec for line chart
function createSpec(data, metric) {
  const metricLabels = {
    aqi: 'Air Quality Index',
    eco2: 'eCO2 (ppm)',
    tvoc: 'TVOC (ppb)',
    temperature_f: 'Temperature (°F)',
    humidity_percent: 'Humidity (%)',
    pressure_hpa: 'Pressure (hPa)',
  };

  // Transform data for Vega
  const values = data.map(d => ({
    time: new Date(d.recorded_at).getTime(),
    value: d[metric],
  })).sort((a, b) => a.time - b.time);

  return {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 800,
    height: 400,
    padding: 5,
    autosize: { type: 'fit', contains: 'padding' },

    data: [{ name: 'table', values }],

    scales: [
      {
        name: 'x',
        type: 'time',
        range: 'width',
        domain: { data: 'table', field: 'time' },
      },
      {
        name: 'y',
        type: 'linear',
        range: 'height',
        nice: true,
        zero: metric === 'aqi',
        domain: { data: 'table', field: 'value' },
      },
    ],

    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        title: 'Time',
        labelAngle: -45,
        labelAlign: 'right',
        format: '%m/%d %H:%M',
      },
      {
        orient: 'left',
        scale: 'y',
        title: metricLabels[metric] || metric,
      },
    ],

    marks: [
      {
        type: 'line',
        from: { data: 'table' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'time' },
            y: { scale: 'y', field: 'value' },
            stroke: { value: '#4a90d9' },
            strokeWidth: { value: 2 },
          },
          update: {
            interpolate: { value: 'monotone' },
          },
        },
      },
      {
        type: 'symbol',
        from: { data: 'table' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'time' },
            y: { scale: 'y', field: 'value' },
            fill: { value: '#4a90d9' },
            size: { value: 30 },
          },
          update: {
            fillOpacity: { value: 0.7 },
          },
          hover: {
            fillOpacity: { value: 1 },
            size: { value: 60 },
          },
        },
      },
    ],
  };
}

// Render chart
async function renderChart() {
  const startDate = document.getElementById('date-start').value;
  const endDate = document.getElementById('date-end').value;
  const metric = document.getElementById('metric').value;
  const chartEl = document.getElementById('chart');

  try {
    chartEl.innerHTML = '<p>Loading...</p>';

    const since = startDate ? new Date(startDate).toISOString() : null;
    const data = await fetchData(since, endDate);

    if (data.length === 0) {
      chartEl.innerHTML = '<p>No data available for selected range.</p>';
      return;
    }

    const spec = createSpec(data, metric);
    const view = new vega.View(vega.parse(spec, null, { ast: true }), {
      expr:      vega.expressionInterpreter,
      renderer: 'svg',
      container: '#chart',
      hover: true,
    });

    await view.runAsync();
  } catch (err) {
    chartEl.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    console.error(err);
  }
}

// Display latest reading
async function displayLatest() {
  const latestEl = document.getElementById('latest-data');

  try {
    const data = await fetchLatest();
    if (!data) {
      latestEl.innerHTML = '<p>No readings available.</p>';
      return;
    }

    const time = new Date(data.recorded_at).toLocaleString();
    latestEl.innerHTML = `
      <div class="reading-grid">
        <div class="reading-item">
          <span class="label">Time</span>
          <span class="value">${time}</span>
        </div>
        <div class="reading-item">
          <span class="label">AQI</span>
          <span class="value aqi-${data.aqi}">${data.aqi}</span>
        </div>
        <div class="reading-item">
          <span class="label">eCO2</span>
          <span class="value">${data.eco2} ppm</span>
        </div>
        <div class="reading-item">
          <span class="label">TVOC</span>
          <span class="value">${data.tvoc} ppb</span>
        </div>
        <div class="reading-item">
          <span class="label">Temperature</span>
          <span class="value">${data.temperature_f.toFixed(1)}°F</span>
        </div>
        <div class="reading-item">
          <span class="label">Humidity</span>
          <span class="value">${data.humidity_percent.toFixed(1)}%</span>
        </div>
        <div class="reading-item">
          <span class="label">Pressure</span>
          <span class="value">${data.pressure_hpa.toFixed(1)} hPa</span>
        </div>
      </div>
    `;
  } catch (err) {
    latestEl.innerHTML = `<p class="error">Error loading latest reading.</p>`;
    console.error(err);
  }
}

// Initialize
function init() {
  initDateInputs();
  renderChart();
  displayLatest();

  // Event listeners
  document.getElementById('refresh').addEventListener('click', () => {
    renderChart();
    displayLatest();
  });

  document.getElementById('metric').addEventListener('change', renderChart);
  document.getElementById('date-start').addEventListener('change', renderChart);
  document.getElementById('date-end').addEventListener('change', renderChart);
}

document.addEventListener('DOMContentLoaded', init);
