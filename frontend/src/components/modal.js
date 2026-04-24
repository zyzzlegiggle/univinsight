/**
 * UnivInsight — Modal Component
 * Renders a multi-tab modal with data from various APIs.
 */
import { Chart, registerables } from 'chart.js';
import { fetchMarket, fetchFinance, fetchClimate, fetchSports, fetchTrends } from '../services/api.js';

Chart.register(...registerables);

const TABS = [
  { id: 'market',  label: 'Market Forecast', icon: '📊' },
  { id: 'finance', label: 'Finance',         icon: '💰' },
  { id: 'sports',  label: 'Sports',          icon: '⚽' },
  { id: 'climate', label: 'Climate',         icon: '🌤️' },
  { id: 'trends',  label: 'Trends',          icon: '📈' },
];

let activeTab = 'market';
let locationData = {};
let charts = [];

// ─── Weather code to description ──────────────────────────────
const WEATHER_DESC = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
  55: 'Dense drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
  81: 'Moderate showers', 82: 'Heavy showers', 95: 'Thunderstorm',
};

// ─── Public API ──────────────────────────────────────────────
export function openModal(place) {
  locationData = place;
  activeTab = 'market';
  renderModal();
  document.getElementById('modal-overlay').classList.add('modal-overlay--open');
  loadTabData(activeTab);
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('modal-overlay--open');
  destroyCharts();
}

function destroyCharts() {
  charts.forEach(c => c.destroy());
  charts = [];
}

// ─── Render ──────────────────────────────────────────────────
function renderModal() {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  const name = locationData.name || 'Unknown';
  const coords = locationData.lat && locationData.lng
    ? `${Math.abs(locationData.lat).toFixed(4)}°${locationData.lat >= 0 ? 'N' : 'S'}, ${Math.abs(locationData.lng).toFixed(4)}°${locationData.lng >= 0 ? 'E' : 'W'}`
    : '';

  overlay.innerHTML = `
    <div class="modal" id="modal">
      <div class="modal__header">
        <div>
          <h2 class="modal__title">${name}</h2>
          <span class="modal__coords">${coords}</span>
        </div>
        <button class="modal__close" id="modal-close">&times;</button>
      </div>
      <div class="modal__tabs" id="modal-tabs">
        ${TABS.map(t => `
          <button class="modal__tab ${t.id === activeTab ? 'modal__tab--active' : ''}" data-tab="${t.id}">
            <span class="modal__tab-icon">${t.icon}</span>
            <span class="modal__tab-label">${t.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="modal__body" id="modal-body">
        <div class="modal__loading"><div class="modal__spinner"></div><p>Loading data…</p></div>
      </div>
    </div>
  `;

  // Events
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.modal__tab');
    if (!btn || btn.dataset.tab === activeTab) return;
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.modal__tab').forEach(b => b.classList.remove('modal__tab--active'));
    btn.classList.add('modal__tab--active');
    destroyCharts();
    loadTabData(activeTab);
  });
}

// ─── Tab Data Loaders ────────────────────────────────────────
async function loadTabData(tab) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `<div class="modal__loading"><div class="modal__spinner"></div><p>Loading data…</p></div>`;

  try {
    const loc = locationData.name || '';
    const country = locationData.country || '';
    const lat = locationData.lat || 0;
    const lng = locationData.lng || 0;

    switch (tab) {
      case 'market':  return renderMarket(await fetchMarket(loc, country));
      case 'finance': return renderFinance(await fetchFinance(loc, country));
      case 'sports':  return renderSports(await fetchSports(loc, country));
      case 'climate': return renderClimate(await fetchClimate(lat, lng, loc));
      case 'trends':  return renderTrends(await fetchTrends(loc));
    }
  } catch (err) {
    body.innerHTML = `
      <div class="modal__error">
        <span class="modal__error-icon">⚠️</span>
        <h3>Failed to load data</h3>
        <p>${err.message}</p>
        <p class="modal__error-hint">Make sure the backend is running: <code>uvicorn main:app --reload</code></p>
      </div>
    `;
  }
}

// ─── Market Tab ──────────────────────────────────────────────
function cardTag(url) {
  if (url) return { open: `<a href="${url}" target="_blank" rel="noopener" class="prediction-card">`, close: '</a>' };
  return { open: '<div class="prediction-card">', close: '</div>' };
}

function renderMarket(data) {
  const body = document.getElementById('modal-body');
  const pm = data.polymarket || [];
  const mc = data.metaculus || [];
  const ks = data.kalshi || [];

  if (pm.length === 0 && mc.length === 0 && ks.length === 0) {
    body.innerHTML = `<div class="modal__empty"><span>📊</span><h3>No prediction markets found</h3><p>No active markets related to "${data.location}" on Polymarket, Kalshi, or Metaculus.</p></div>`;
    return;
  }

  body.innerHTML = `
    ${ks.length > 0 ? `
      <div class="section">
        <h3 class="section__title">Kalshi</h3>
        <div class="card-grid">
          ${ks.map(m => {
            const tag = cardTag(m.url);
            return `
            ${tag.open}
              <div class="prediction-card__title">${m.title}</div>
              ${m.subtitle ? `<div class="prediction-card__meta" style="margin-bottom:8px">${m.subtitle}</div>` : ''}
              ${m.probability != null ? `
                <div class="prediction-card__prob">
                  <div class="prob-bar"><div class="prob-bar__fill" style="width:${m.probability}%"></div></div>
                  <span class="prob-value">${m.probability}%</span>
                </div>
              ` : ''}
            ${tag.close}`;
          }).join('')}
        </div>
      </div>
    ` : ''}
    ${pm.length > 0 ? `
      <div class="section">
        <h3 class="section__title">Polymarket</h3>
        <div class="card-grid">
          ${pm.map(m => {
            const tag = cardTag(m.url);
            return `
            ${tag.open}
              <div class="prediction-card__title">${m.title}</div>
              ${m.probability != null ? `
                <div class="prediction-card__prob">
                  <div class="prob-bar"><div class="prob-bar__fill" style="width:${m.probability}%"></div></div>
                  <span class="prob-value">${m.probability}%</span>
                </div>
              ` : ''}
              <div class="prediction-card__meta">Vol: $${Number(m.volume || 0).toLocaleString()}</div>
            ${tag.close}`;
          }).join('')}
        </div>
      </div>
    ` : ''}
    ${mc.length > 0 ? `
      <div class="section">
        <h3 class="section__title">Metaculus</h3>
        <div class="card-grid">
          ${mc.map(m => {
            const tag = cardTag(m.url);
            return `
            ${tag.open}
              <div class="prediction-card__title">${m.title}</div>
              ${m.prediction != null ? `<div class="prediction-card__meta">Community: ${m.prediction}</div>` : ''}
              <div class="prediction-card__meta">${m.votes || 0} forecasters</div>
            ${tag.close}`;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ─── Finance Tab ─────────────────────────────────────────────
function renderFinance(data) {
  const body = document.getElementById('modal-body');

  if (!data.has_fred_key && !data.has_alpha_vantage_key) {
    body.innerHTML = `
      <div class="modal__empty">
        <span>🔑</span>
        <h3>API keys required</h3>
        <p>Add free API keys to <code>backend/.env</code> to unlock finance data:</p>
        <ul class="key-list">
          <li><strong>FRED_API_KEY</strong> — <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank">Get free key</a></li>
          <li><strong>ALPHA_VANTAGE_API_KEY</strong> — <a href="https://www.alphavantage.co/support/#api-key" target="_blank">Get free key</a></li>
        </ul>
      </div>
    `;
    return;
  }

  const series = data.series || {};
  const seriesKeys = Object.keys(series);

  body.innerHTML = `
    <div class="chart-grid">
      ${seriesKeys.map((name, i) => `
        <div class="chart-card">
          <h4 class="chart-card__title">${name}</h4>
          <canvas id="finance-chart-${i}"></canvas>
        </div>
      `).join('')}
      ${data.stock ? `
        <div class="chart-card">
          <h4 class="chart-card__title">S&P 500 Index</h4>
          <canvas id="finance-chart-stock"></canvas>
        </div>
      ` : ''}
    </div>
    ${!data.has_fred_key ? '<p class="modal__hint">Add FRED_API_KEY for economic indicators.</p>' : ''}
    ${!data.has_alpha_vantage_key ? '<p class="modal__hint">Add ALPHA_VANTAGE_API_KEY for stock data.</p>' : ''}
  `;

  // Render charts
  const colors = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981'];
  seriesKeys.forEach((name, i) => {
    const s = series[name];
    createLineChart(`finance-chart-${i}`, s.dates, s.values, name, colors[i % colors.length]);
  });
  if (data.stock) {
    createLineChart('finance-chart-stock', data.stock.dates, data.stock.values, 'S&P 500', '#8b5cf6');
  }
}

// ─── Sports Tab ──────────────────────────────────────────────
function renderSports(data) {
  const body = document.getElementById('modal-body');
  const teams = data.teams || [];
  const news = data.news || [];

  if (teams.length === 0 && news.length === 0) {
    body.innerHTML = `<div class="modal__empty"><span>⚽</span><h3>No sports data found</h3><p>No teams or news found for "${data.location}".</p></div>`;
    return;
  }

  body.innerHTML = `
    ${teams.length > 0 ? `
      <div class="section">
        <h3 class="section__title">Local Teams</h3>
        <div class="card-grid">
          ${teams.map(t => `
            <div class="team-card">
              ${t.logo ? `<img class="team-card__logo" src="${t.logo}" alt="${t.name}" />` : '<div class="team-card__logo-placeholder">⚽</div>'}
              <div class="team-card__info">
                <div class="team-card__name">${t.name}</div>
                <div class="team-card__detail">${t.sport} · ${t.league}</div>
                ${t.stadium ? `<div class="team-card__detail">🏟️ ${t.stadium}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="section">
      <h3 class="section__title">Local Sports News</h3>
      ${!data.has_news_key ? `
        <div class="modal__note" style="background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">
          <strong>News API key required:</strong> Add a free key to <code>backend/.env</code> to see local sports headlines.
          <br/><a href="https://newsapi.org/register" target="_blank" style="color:#2563eb; font-weight:600;">Get free key here &rarr;</a>
        </div>
      ` : news.length > 0 ? `
        <div class="news-list" style="display:flex; flex-direction:column; gap:1rem;">
          ${news.map(n => `
            <a href="${n.url}" target="_blank" class="prediction-card" style="display:flex; gap:1rem; align-items:flex-start;">
              ${n.image ? `<img src="${n.image}" style="width:80px; height:60px; object-fit:cover; border-radius:4px; flex-shrink:0;" />` : ''}
              <div style="flex:1;">
                <div class="prediction-card__title" style="margin:0; font-size:0.875rem;">${n.title}</div>
                <div class="prediction-card__meta" style="margin-top:4px;">${n.source} · ${new Date(n.published).toLocaleDateString()}</div>
              </div>
            </a>
          `).join('')}
        </div>
      ` : `<p class="modal__hint">No recent sports news found for this location.</p>`}
    </div>

    <div class="modal__note">
      <strong>Note:</strong> ${data.note}
    </div>
  `;
}

// ─── Climate Tab ─────────────────────────────────────────────
function renderClimate(data) {
  const body = document.getElementById('modal-body');
  const cur = data.current;

  body.innerHTML = `
    ${cur ? `
      <div class="weather-current">
        <div class="weather-current__main">
          <span class="weather-current__temp">${cur.temperature}°C</span>
          <span class="weather-current__desc">${WEATHER_DESC[cur.weather_code] || 'Unknown'}</span>
        </div>
        <div class="weather-current__details">
          <div class="weather-stat"><span class="weather-stat__label">Feels like</span><span class="weather-stat__value">${cur.feels_like}°C</span></div>
          <div class="weather-stat"><span class="weather-stat__label">Humidity</span><span class="weather-stat__value">${cur.humidity}%</span></div>
          <div class="weather-stat"><span class="weather-stat__label">Wind</span><span class="weather-stat__value">${cur.wind_speed} km/h</span></div>
        </div>
      </div>
    ` : ''}
    <div class="chart-grid">
      ${data.forecast ? `
        <div class="chart-card">
          <h4 class="chart-card__title">7-Day Forecast</h4>
          <canvas id="climate-forecast"></canvas>
        </div>
      ` : ''}
      ${data.historical ? `
        <div class="chart-card">
          <h4 class="chart-card__title">Last 30 Days — Temperature</h4>
          <canvas id="climate-historical"></canvas>
        </div>
      ` : ''}
    </div>
  `;

  if (data.forecast) {
    const ctx = document.getElementById('climate-forecast');
    const c = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.forecast.dates.map(d => d.slice(5)),
        datasets: [
          { label: 'High °C', data: data.forecast.temp_max, backgroundColor: '#f59e0b88', borderColor: '#f59e0b', borderWidth: 1 },
          { label: 'Low °C',  data: data.forecast.temp_min, backgroundColor: '#3b82f688', borderColor: '#3b82f6', borderWidth: 1 },
        ],
      },
      options: chartOptions('°C'),
    });
    charts.push(c);
  }

  if (data.historical) {
    createLineChart('climate-historical', data.historical.dates.map(d => d.slice(5)), data.historical.temp_max, 'High °C', '#f59e0b');
  }
}

// ─── Trends Tab ──────────────────────────────────────────────
function renderTrends(data) {
  const body = document.getElementById('modal-body');

  if (data.error) {
    body.innerHTML = `<div class="modal__empty"><span>📈</span><h3>Trends unavailable</h3><p>${data.error}</p></div>`;
    return;
  }

  body.innerHTML = `
    ${data.interest_over_time ? `
      <div class="chart-card" style="margin-bottom:1.5rem">
        <h4 class="chart-card__title">Google Trends — "${data.location}"</h4>
        <canvas id="trends-chart"></canvas>
      </div>
    ` : '<div class="modal__empty"><span>📈</span><h3>No trend data</h3><p>Not enough search volume for this location.</p></div>'}
    ${data.related_queries.length > 0 ? `
      <div class="section">
        <h3 class="section__title">Related Queries</h3>
        <div class="tag-list">${data.related_queries.map(q => `<span class="tag">${q}</span>`).join('')}</div>
      </div>
    ` : ''}
  `;

  if (data.interest_over_time) {
    createLineChart('trends-chart', data.interest_over_time.dates.map(d => d.slice(5)), data.interest_over_time.values, 'Search Interest', '#4f46e5');
  }
}

// ─── Chart Helpers ───────────────────────────────────────────
function chartOptions(unit = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#64748b' } } },
    scales: {
      x: { ticks: { font: { size: 10 }, color: '#94a3b8', maxRotation: 45 }, grid: { color: '#e2e8f0' } },
      y: { ticks: { font: { size: 10 }, color: '#94a3b8', callback: v => v + unit }, grid: { color: '#e2e8f0' } },
    },
  };
}

function createLineChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const c = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + '18',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      }],
    },
    options: chartOptions(),
  });
  charts.push(c);
}
