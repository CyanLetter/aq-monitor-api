// Air Quality Dashboard

const API_BASE = '/api/sensors';
const USE_MOCK = new URLSearchParams(window.location.search).get('mock') === 'true';

// Metrics configuration
const METRICS = [
  { key: 'co2', label: 'CO2', elementId: 'chart-co2', color: '#e53935', unit: 'ppm' },
  { key: 'temperature_f', label: 'Temperature', elementId: 'chart-temperature', color: '#ff9800', unit: '°F' },
  { key: 'humidity_percent', label: 'Humidity', elementId: 'chart-humidity', color: '#2196f3', unit: '%' },
  { key: 'pressure_hpa', label: 'Pressure', elementId: 'chart-pressure', color: '#9c27b0', unit: 'hPa' },
];

// Store chart instances for resize handling
const chartInstances = {};

// Current time frame state
let currentTimeFrame = '24h';

// Get date range based on time frame
function getDateRange() {
  const now = new Date();

  switch (currentTimeFrame) {
    case '1h':
      return {
        since: new Date(now.getTime() - 60 * 60 * 1000),
        until: null,
      };
    case '24h':
      return {
        since: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        until: null,
      };
    case 'specific':
      const dateInput = document.getElementById('specific-date');
      if (dateInput.value) {
        const date = dateInput.value;
        return {
          since: new Date(date + 'T00:00:00'),
          until: new Date(date + 'T23:59:59'),
        };
      }
      // Fall back to 24h if no date selected
      return {
        since: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        until: null,
      };
    default:
      return {
        since: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        until: null,
      };
  }
}

// Fetch sensor data from API or mock
async function fetchData() {
  const { since, until } = getDateRange();

  if (USE_MOCK) {
    const response = await fetch('/mock-data.json');
    if (!response.ok) throw new Error('Failed to fetch mock data');

    let data = await response.json();

    // Filter by date range client-side
    data = data.filter(d => {
      const time = new Date(d.recorded_at);
      if (since && time < since) return false;
      if (until && time > until) return false;
      return true;
    });

    return data;
  }

  // Live API
  const params = new URLSearchParams({ limit: 1000 });
  if (since) params.append('since', since.toISOString());

  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) throw new Error('Failed to fetch data');

  let data = await response.json();

  // Filter by end date if specified
  if (until) {
    data = data.filter(d => new Date(d.recorded_at) <= until);
  }

  return data;
}

// Fetch latest reading
async function fetchLatest() {
  if (USE_MOCK) {
    const response = await fetch('/mock-data.json');
    if (!response.ok) return null;
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  const response = await fetch(`${API_BASE}/latest`);
  if (!response.ok) return null;
  return response.json();
}

// Format time for display (12-hour format)
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Create ECharts option for a metric
function createChartOption(data, metric) {
  // Transform and sort data
  const chartData = data
    .map(d => ({
      time: new Date(d.recorded_at),
      value: d[metric.key],
    }))
    .filter(d => d.value != null)
    .sort((a, b) => a.time - b.time);

  // Build y-axis config
  const yAxisConfig = {
    type: 'value',
    splitLine: { lineStyle: { color: '#eee' } },
  };

  // CO2 should have minimum of 400 (outdoor ambient baseline)
  if (metric.key === 'co2') {
    yAxisConfig.min = 400;
  }

  return {
    grid: {
      left: 50,
      right: 20,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value) => formatTime(new Date(value)),
        rotate: 45,
        fontSize: 10,
      },
      splitLine: { show: false },
    },
    yAxis: yAxisConfig,
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const date = new Date(params.value[0]);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = formatTime(date);
        return `${dateStr}, ${timeStr}<br/><strong>${params.value[1].toFixed(1)} ${metric.unit}</strong>`;
      },
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: metric.color, width: 2 },
      itemStyle: { color: metric.color },
      data: chartData.map(d => [d.time.getTime(), d.value]),
    }],
  };
}

// Render all charts
async function renderCharts() {
  // Show loading state
  METRICS.forEach(metric => {
    const chartEl = document.getElementById(metric.elementId);
    if (!chartInstances[metric.elementId]) {
      chartEl.innerHTML = '<p class="loading-text">Loading...</p>';
    }
  });

  try {
    const data = await fetchData();

    if (data.length === 0) {
      METRICS.forEach(metric => {
        const chartEl = document.getElementById(metric.elementId);
        if (chartInstances[metric.elementId]) {
          chartInstances[metric.elementId].dispose();
          chartInstances[metric.elementId] = null;
        }
        chartEl.innerHTML = '<p class="loading-text">No data available for selected range.</p>';
      });
      return;
    }

    // Render each chart
    for (const metric of METRICS) {
      const chartEl = document.getElementById(metric.elementId);

      // Initialize or get existing chart instance
      if (!chartInstances[metric.elementId]) {
        chartEl.innerHTML = '';
        chartInstances[metric.elementId] = echarts.init(chartEl);
      }

      const option = createChartOption(data, metric);
      chartInstances[metric.elementId].setOption(option);
    }
  } catch (err) {
    METRICS.forEach(metric => {
      const chartEl = document.getElementById(metric.elementId);
      if (chartInstances[metric.elementId]) {
        chartInstances[metric.elementId].dispose();
        chartInstances[metric.elementId] = null;
      }
      chartEl.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    });
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
          <span class="label">CO2</span>
          <span class="value">${data.co2} ppm</span>
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

// Update time frame button states
function updateTimeFrameButtons() {
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === currentTimeFrame);
  });

  // Show/hide specific date picker
  const datePicker = document.getElementById('specific-date-picker');
  datePicker.classList.toggle('hidden', currentTimeFrame !== 'specific');
}

// Handle window resize
function handleResize() {
  Object.values(chartInstances).forEach(chart => {
    if (chart) chart.resize();
  });
}

// Initialize
function init() {
  // Show mock banner if using mock data
  if (USE_MOCK) {
    document.getElementById('mock-banner').classList.remove('hidden');
  }

  // Set default specific date to today
  const dateInput = document.getElementById('specific-date');
  dateInput.value = new Date().toISOString().split('T')[0];

  // Initial render
  renderCharts();
  displayLatest();

  // Time frame button handlers
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTimeFrame = btn.dataset.range;
      updateTimeFrameButtons();
      renderCharts();
    });
  });

  // Specific date change handler
  document.getElementById('specific-date').addEventListener('change', () => {
    if (currentTimeFrame === 'specific') {
      renderCharts();
    }
  });

  // Refresh button
  document.getElementById('refresh').addEventListener('click', () => {
    renderCharts();
    displayLatest();
  });

  // Handle window resize
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', init);
