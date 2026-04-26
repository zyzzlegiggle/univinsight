import './style.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchHeadlines, fetchPriceHistory, fetchMarketTrades } from './services/api.js';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let map;
let allMarketData = [];

// ─── App Shell ───────────────────────────────────────────────
function renderApp() {
  document.getElementById('app').innerHTML = `
    <div class="loading-screen" id="loading-screen">
      <div class="loading__spinner"></div>
      <div class="loading__text">Initializing Map...</div>
    </div>

    <header class="header">
      <div class="header__brand">
        <div class="header__logo">U</div>
        <div>
          <div class="header__title">UnivInsight</div>
          <div class="header__subtitle">Universal Insight</div>
        </div>
      </div>

      <div class="header__center">
        <div class="search-container">
          <input type="text" id="search-input" class="search-input" placeholder="Find Market" autocomplete="off" />
          <div class="search-results" id="search-results"></div>
        </div>
      </div>

      <div class="header__actions">
        <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
          <svg class="theme-toggle__icon--sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg class="theme-toggle__icon--moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
      </div>
    </header>

    <div class="search-overlay" id="search-overlay"></div>

    <div class="ticker" id="ticker-container">
      <div class="ticker__track" id="ticker-track">
        <div class="ticker__loading">Loading market trends...</div>
      </div>
    </div>

    <main class="main">
      <div class="map-container" id="map-container">
        <div id="map" style="width:100%;height:100%;"></div>
      </div>
    </main>

    <div class="market-modal-overlay" id="market-modal-overlay">
      <div class="market-modal" id="market-modal"></div>
    </div>
  `;
}

// ─── Utilities ───────────────────────────────────────────────
function fmtVol(val) {
  const n = Number(val);
  if (!n) return '$0';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtTime(d) {
  if (!d) return '--';
  try {
    const dt = new Date(d);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[dt.getDay()];
    let hrs = dt.getHours();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    const mins = dt.getMinutes().toString().padStart(2, '0');
    return `${day} ${hrs}:${mins} ${ampm}`;
  } catch { return '--'; }
}

function fmtCountdown(d) {
  if (!d) return 'N/A';
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? days + 'd ' + hrs + 'h' : hrs + 'h';
}

// ─── Market Modal ────────────────────────────────────────────
async function openMarketModal(mkt, clickedCoords) {
  const overlay = document.getElementById('market-modal-overlay');
  const modal = document.getElementById('market-modal');
  overlay.classList.add('market-modal-overlay--open');

  const yes = mkt.probability || 0;
  const no = Math.round((100 - yes) * 10) / 10;

  modal.innerHTML = `
    <div class="mm__header">
      <div class="mm__header-left">
        <span class="mm__source">
          ${mkt.source === 'Polymarket'
      ? '<img src="/polymarket-icon.png" class="source-icon" alt="Polymarket" />'
      : mkt.source || 'Polymarket'}
        </span>
        <span class="mm__vol">VOL ${fmtVol(mkt.volume)}</span>
      </div>
      <button class="mm__close" id="mm-close">&times;</button>
    </div>
    ${mkt.image ? `<img src="${mkt.image}" class="mm__img" />` : ''}
    <h3 class="mm__title">${mkt.title}</h3>
    <div class="mm__prob-row">
      ${mkt.outcomes && mkt.outcomes.length > 2 ? `
        <div class="mm__outcomes-list">
          ${mkt.outcomes.map(o => `
            <div class="mm__outcome-item">
              <div class="mm__outcome-info">
                <span style="color:#22c55e; font-size:11px; font-weight:700">Yes ${o.probability}%</span> 
                <span class="mm__outcome-title">${o.title}</span>
                <span style="color:#ef4444; font-size:11px; font-weight:700">No ${Math.round((100 - o.probability) * 10) / 10}%</span>
              </div>
              <div class="dual-prob__bar" style="height:4px; margin-top:2px;">
                <div class="bar-yes" style="width:${o.probability}%"></div>
                <div class="bar-no" style="width:${100 - o.probability}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="dual-prob__bar" style="height:6px">
          <div class="bar-yes" style="width:${yes}%"></div>
          <div class="bar-no" style="width:${no}%"></div>
        </div>
        <div class="mm__prob-labels">
          <span class="mm__yes">YES ${yes}%</span>
          <span class="mm__no">NO ${no}%</span>
        </div>
      `}
    </div>
    <div class="mm__tabs">
      <button class="mm__tab mm__tab--active" data-tab="stats">Stats</button>
      <button class="mm__tab" data-tab="trades">Trades</button>
      <button class="mm__tab" data-tab="rules">Rules</button>
      <button class="mm__tab" data-tab="related">Related Info</button>
    </div>
    <div class="mm__body" id="mm-body">
      <div class="mm__loading"><div class="modal__spinner"></div></div>
    </div>
  `;

  modal.querySelectorAll('.mm__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.mm__tab').forEach(t => t.classList.remove('mm__tab--active'));
      tab.classList.add('mm__tab--active');
      const name = tab.dataset.tab;
      if (name === 'stats') loadStats(mkt);
      else if (name === 'trades') loadTrades(mkt);
      else if (name === 'rules') loadRules(mkt);
      else {
        document.getElementById('mm-body').innerHTML = `
          <div class="mm__no-data">Related information will be available soon.</div>
        `;
      }
    });
  });

  document.getElementById('mm-close').addEventListener('click', closeModal);
  loadStats(mkt);
}

function closeModal() {
  document.getElementById('market-modal-overlay').classList.remove('market-modal-overlay--open');
  clearConnectionLines();
}

// ─── Stats Tab ───────────────────────────────────────────────
async function loadStats(mkt) {
  const body = document.getElementById('mm-body');
  body.innerHTML = `<div class="mm__loading"><div class="modal__spinner"></div></div>`;

  let history = [];
  if (mkt.token_id) {
    try {
      const d = await fetchPriceHistory(mkt.token_id, '1d');
      history = d.history || [];
    } catch (e) { console.warn(e); }
  }

  body.innerHTML = `
    <div class="mm__chart-section">
      <div class="mm__interval-row">
        ${['1h', '6h', '1d', '1w', '1m', 'max'].map((iv, i) =>
    `<button class="mm__iv${i === 2 ? ' mm__iv--active' : ''}" data-iv="${iv}">${iv.toUpperCase()}</button>`
  ).join('')}
      </div>
      <div class="mm__chart-wrap">
        <canvas id="mm-chart" width="420" height="180"></canvas>
        <div class="mm__tooltip" id="mm-tooltip"></div>
      </div>
    </div>
    <div class="mm__divider"></div>
    <div class="mm__stats-grid">
      <div class="mm__stat"><span class="mm__stat-label">24H Volume</span><span class="mm__stat-value">${fmtVol(mkt.volume)}</span></div>
      <div class="mm__stat"><span class="mm__stat-label">Liquidity</span><span class="mm__stat-value">${fmtVol(mkt.liquidity)}</span></div>
      <div class="mm__stat"><span class="mm__stat-label">1W Volume</span><span class="mm__stat-value">${fmtVol(mkt.volume)}</span></div>
      <div class="mm__stat"><span class="mm__stat-label">Competitiveness</span><span class="mm__stat-value">${mkt.probability ? Math.min(100, Math.round(Math.abs(50 - mkt.probability) * 2)) + '%' : 'N/A'}</span></div>
      <div class="mm__stat"><span class="mm__stat-label">1M Volume</span><span class="mm__stat-value">${fmtVol(mkt.volume)}</span></div>
      <div class="mm__stat"><span class="mm__stat-label">Closes In</span><span class="mm__stat-value">${fmtCountdown(mkt.end_date)}</span></div>
    </div>
  `;

  drawChart(history);

  body.querySelectorAll('.mm__iv').forEach(btn => {
    btn.addEventListener('click', async () => {
      body.querySelectorAll('.mm__iv').forEach(b => b.classList.remove('mm__iv--active'));
      btn.classList.add('mm__iv--active');
      if (!mkt.token_id) return;
      try {
        const d = await fetchPriceHistory(mkt.token_id, btn.dataset.iv);
        drawChart(d.history || []);
      } catch (e) { console.warn(e); }
    });
  });
}

function drawChart(history) {
  const canvas = document.getElementById('mm-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const mn = history.length ? Math.min(...history.map(h => Number(h.p))) * 0.98 : 0;
  const mx = history.length ? Math.max(...history.map(h => Number(h.p))) * 1.02 : 1;
  const rng = mx - mn || 1;
  const px = 0, py = 12;
  const dw = W, dh = H - py * 2;

  const getX = i => px + (i / (history.length - 1)) * dw;
  const getY = p => py + dh - ((p - mn) / rng) * dh;

  function render(hoverIdx = -1) {
    ctx.clearRect(0, 0, W, H);
    if (!history.length) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No price data available', W / 2, H / 2);
      return;
    }

    // Fill
    const grad = ctx.createLinearGradient(0, py, 0, H - py);
    grad.addColorStop(0, 'rgba(79,70,229,0.12)');
    grad.addColorStop(1, 'rgba(79,70,229,0)');
    ctx.beginPath();
    ctx.moveTo(px, H - py);
    history.forEach((h, i) => ctx.lineTo(getX(i), getY(Number(h.p))));
    ctx.lineTo(W, H - py);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    history.forEach((h, i) => i === 0 ? ctx.moveTo(getX(i), getY(Number(h.p))) : ctx.lineTo(getX(i), getY(Number(h.p))));
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (hoverIdx >= 0 && hoverIdx < history.length) {
      const pt = history[hoverIdx];
      const x = getX(hoverIdx);
      const y = getY(Number(pt.p));

      // Crosshair lines
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(79,70,229,0.3)';
      ctx.lineWidth = 1;

      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Axis labels
      ctx.font = '10px Inter, sans-serif';
      const pText = (Number(pt.p) * 100).toFixed(1) + 'c';
      const tText = pt.t ? new Date(pt.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      // Price label (Vertical)
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(W - 40, y - 10, 40, 20);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(pText, W - 4, y + 4);

      // Time label (Horizontal)
      ctx.fillStyle = '#4f46e5';
      const tW = ctx.measureText(tText).width + 10;
      ctx.fillRect(x - tW / 2, H - 15, tW, 15);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(tText, x, H - 4);
    }
  }

  render();

  const tt = document.getElementById('mm-tooltip');
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect();
    // Scale mouse position to internal canvas dimensions
    const scaleX = W / r.width;
    const mx2 = (e.clientX - r.left) * scaleX;

    const idx = Math.round((mx2 / W) * (history.length - 1));
    if (idx >= 0 && idx < history.length) {
      render(idx);
      const pt = history[idx];
      tt.innerHTML = `<strong>${(Number(pt.p) * 100).toFixed(1)}%</strong><br/>${pt.t ? new Date(pt.t * 1000).toLocaleString() : ''}`;
      tt.style.display = 'block';

      // Tooltip position in CSS pixels (relative to rect)
      const tx = (e.clientX - r.left);
      const ty = (getY(Number(pt.p)) / (H / r.height));

      tt.style.left = Math.min(tx + 10, r.width - 80) + 'px';
      tt.style.top = (ty - 30) + 'px';
    } else {
      tt.style.display = 'none';
      render();
    }
  };
  canvas.onmouseleave = () => { tt.style.display = 'none'; render(); };
}


// ─── Trades Tab ──────────────────────────────────────────────
async function loadTrades(mkt) {
  const body = document.getElementById('mm-body');
  body.innerHTML = `<div class="mm__loading"><div class="modal__spinner"></div></div>`;

  let trades = [];
  try {
    const d = await fetchMarketTrades(mkt.condition_id || '', mkt.token_id || '');
    trades = d.trades || [];
  } catch (e) { console.warn(e); }

  const filters = [['All', 0], ['$10', 10], ['$100', 100], ['$1K', 1000]];

  body.innerHTML = `
    <div class="mm__trades-filter">
      <span class="mm__trades-label">Min Trade</span>
      ${filters.map(([label, val], i) =>
    `<button class="mm__fbtn${i === 0 ? ' mm__fbtn--active' : ''}" data-min="${val}">${label}</button>`
  ).join('')}
      <div class="mm__fcustom">
        <span>$</span><input type="text" inputmode="numeric" id="mm-custom-f" />
      </div>
    </div>
    <table class="mm__ttable">
      <thead><tr><th>Time</th><th>Pos</th><th>Value</th><th>Price</th><th>Side</th></tr></thead>
      <tbody id="mm-tbody"></tbody>
    </table>
    ${trades.length === 0 ? '<div class="mm__no-data">No trades available for this market</div>' : ''}
  `;

  function render(min) {
    const tbody = document.getElementById('mm-tbody');
    const f = trades.filter(t => t.value >= min);
    tbody.innerHTML = f.map(t => {
      const isBuy = (t.side || '').includes('BUY');
      const pos = (t.position || '').toLowerCase().includes('yes') ? 'Yes' : 'No';
      return `<tr>
        <td>${fmtTime(t.time)}</td>
        <td class="${pos === 'Yes' ? 'c-green' : 'c-red'}">${pos}</td>
        <td>$${t.value.toLocaleString()}</td>
        <td>${(t.price * 100).toFixed(1)}c</td>
        <td class="${isBuy ? 'c-green' : 'c-red'}">${isBuy ? 'Buy' : 'Sell'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="mm__no-data">No trades match filter</td></tr>';
  }

  render(0);

  body.querySelectorAll('.mm__fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.mm__fbtn').forEach(b => b.classList.remove('mm__fbtn--active'));
      btn.classList.add('mm__fbtn--active');
      render(Number(btn.dataset.min));
    });
  });

  const ci = document.getElementById('mm-custom-f');
  if (ci) ci.addEventListener('input', () => {
    body.querySelectorAll('.mm__fbtn').forEach(b => b.classList.remove('mm__fbtn--active'));
    render(Number(ci.value) || 0);
  });
}

// ─── Rules Tab ───────────────────────────────────────────────
function loadRules(mkt) {
  const body = document.getElementById('mm-body');
  const text = mkt.description || '';
  body.innerHTML = text
    ? `<div class="mm__rules">${text.replace(/\n/g, '<br/>')}</div>`
    : '<div class="mm__no-data">No rules available for this market</div>';
}

// ─── Ticker ──────────────────────────────────────────────────
function initTicker(items) {
  const track = document.getElementById('ticker-track');
  const slice = items.slice(0, 14);
  if (!slice.length) { track.innerHTML = '<div class="ticker__item">No market data</div>'; return; }
  const html = slice.map(it => `
    <a href="${it.url}" target="_blank" class="ticker__item">
      ${it.image ? `<img src="${it.image}" class="ticker__img" />` : ''}
      <span class="ticker__title">${it.title}</span>
      <span class="ticker__prob">
        ${it.outcomes && it.outcomes.length > 2
      ? (it.outcomes.reduce((prev, current) => (prev.probability > current.probability) ? prev : current).title)
      : 'Yes'} 
        ${it.probability || 0}%
      </span>
    </a>
  `).join('');
  track.innerHTML = html + html;
}

// ─── Theme ───────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') document.body.classList.add('dark-theme');
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// ─── Search ──────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const overlay = document.getElementById('search-overlay');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.style.display = 'none';
      overlay.classList.remove('search-overlay--visible');
      return;
    }

    const filtered = allMarketData.filter(m =>
      m.title.toLowerCase().includes(q)
    ).slice(0, 8);

    if (filtered.length > 0) {
      results.innerHTML = filtered.map(m => `
        <div class="search-item" data-title="${m.title.replace(/"/g, '&quot;')}">
          <div class="search-item__content">
            <div class="search-item__title">${m.title}</div>
            <div class="search-item__probs">
              <div class="search-prob search-prob--yes">${m.outcomes && m.outcomes.length > 2
          ? (m.outcomes.reduce((prev, current) => (prev.probability > current.probability) ? prev : current).title)
          : 'Yes'} ${m.probability || 0}%</div>
              <div class="search-prob search-prob--no">No ${Math.round((100 - (m.probability || 0)) * 10) / 10}%</div>
              <div class="search-prob search-prob--neutral">${fmtCountdown(m.end_date)}</div>
            </div>
          </div>
        </div>
      `).join('');
      results.style.display = 'block';
      overlay.classList.add('search-overlay--visible');
    } else {
      results.innerHTML = '<div class="search-no-results">No markets found</div>';
      results.style.display = 'block';
      overlay.classList.add('search-overlay--visible');
    }
  });

  results.addEventListener('click', e => {
    const item = e.target.closest('.search-item');
    if (!item) return;

    const title = item.dataset.title;
    const mkt = allMarketData.find(m => m.title === title);
    if (mkt) {
      // Find coordinates from map features
      const marketFeatures = map.getSource('markets')._data.features.filter(
        f => f.properties.title === mkt.title
      );
      if (marketFeatures.length > 0) {
        const coords = marketFeatures[0].geometry.coordinates;
        map.flyTo({ center: coords, zoom: 4, duration: 1200 });

        // Draw connection lines for siblings
        const marketId = marketFeatures[0].properties.market_id;
        const sibling = map.getSource('markets')._data.features.filter(
          f => f.properties.market_id === marketId
        );
        drawConnectionLines(sibling.map(f => f.geometry.coordinates));

        openMarketModal(mkt, coords);
      }
    }

    // Reset search
    input.value = '';
    results.style.display = 'none';
    overlay.classList.remove('search-overlay--visible');
  });

  overlay.addEventListener('click', () => {
    input.value = '';
    results.style.display = 'none';
    overlay.classList.remove('search-overlay--visible');
  });
}

// ─── Connection Lines ────────────────────────────────────────
function clearConnectionLines() {
  if (map.getLayer('connection-lines')) map.removeLayer('connection-lines');
  if (map.getSource('connections')) map.removeSource('connections');
}

function greatCircleArc(start, end, steps = 64) {
  // Convert [lng, lat] degrees to radians
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const lng1 = toRad(start[0]), lat1 = toRad(start[1]);
  const lng2 = toRad(end[0]), lat2 = toRad(end[1]);

  // Central angle via haversine
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const d = 2 * Math.asin(Math.sqrt(a));

  if (d < 1e-10) return [start, end]; // Same point

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return points;
}

function drawConnectionLines(coords) {
  clearConnectionLines();
  if (coords.length < 2) return;

  const features = [];
  for (let i = 1; i < coords.length; i++) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: greatCircleArc(coords[0], coords[i])
      }
    });
  }

  map.addSource('connections', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features }
  });

  map.addLayer({
    id: 'connection-lines',
    type: 'line',
    source: 'connections',
    paint: {
      'line-color': '#4f46e5',
      'line-width': 2,
      'line-opacity': 0.7
    }
  }, 'market-dots');
}

// ─── Map ─────────────────────────────────────────────────────
function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [0, 20], zoom: 2, antialias: true, projection: 'globe',
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  map.on('load', () => {
    map.setFog({
      color: 'rgb(255,255,255)', 'high-color': 'rgb(200,230,255)',
      'horizon-blend': 0.05, 'space-color': 'rgb(240,245,255)', 'star-intensity': 0,
    });

    map.addSource('markets', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: 'market-dots',
      type: 'circle',
      source: 'markets',
      paint: {
        'circle-radius': 6,
        'circle-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      }
    });

    // Hover
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 });
    map.on('mouseenter', 'market-dots', e => {
      map.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      const c = e.features[0].geometry.coordinates.slice();
      const vol = p.volume ? fmtVol(p.volume) : '$0';
      popup.setLngLat(c).setHTML(`
        <div class="map-popup">
          <div class="map-popup__header">
            <span class="map-popup__source">
              ${p.source === 'Polymarket'
          ? '<img src="/polymarket-icon.png" class="source-icon" alt="Polymarket" />'
          : p.source || 'Polymarket'}
            </span>
            <span class="map-popup__vol">VOL ${vol}</span>
          </div>
          ${p.image && p.image !== 'null' ? `<img src="${p.image}" class="map-popup__img" />` : ''}
          <div class="map-popup__title">${p.title}</div>
          <div class="map-popup__prob">
            <div class="dual-prob__bar" style="height:4px;margin-top:6px">
              <div class="bar-yes" style="width:${p.probability || 0}%"></div>
              <div class="bar-no" style="width:${100 - (p.probability || 0)}%"></div>
            </div>
            <div class="search-item__probs" style="margin-top:8px">
              <div class="search-prob search-prob--yes">${p.top_outcome || 'Yes'} ${p.probability || 0}%</div>
              <div class="search-prob search-prob--no">No ${Math.round((100 - (p.probability || 0)) * 10) / 10}%</div>
              <div class="search-prob search-prob--neutral">${fmtCountdown(p.end_date)}</div>
            </div>
          </div>
        </div>
      `).addTo(map);
    });
    map.on('mouseleave', 'market-dots', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Click -> open modal + draw connection lines
    map.on('click', 'market-dots', e => {
      popup.remove();
      const p = e.features[0].properties;
      const clickedCoords = e.features[0].geometry.coordinates.slice();
      const marketId = p.market_id;

      // Zoom to the clicked point
      map.flyTo({ center: clickedCoords, zoom: 4, duration: 1200 });

      // Find the parent market
      const mkt = allMarketData.find(m => m.title === p.title);
      if (!mkt) return;

      // Find all sibling dots and draw lines
      const sibling = map.getSource('markets')._data.features.filter(
        f => f.properties.market_id === marketId
      );
      const coords = sibling.map(f => f.geometry.coordinates);
      drawConnectionLines(coords);

      openMarketModal(mkt, clickedCoords);
    });

    // Click elsewhere to close modal and clear lines
    map.on('click', e => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['market-dots'] });
      if (!features.length) {
        clearConnectionLines();
        closeModal();
      }
    });
  });
}

// ─── Geocode & Plot ──────────────────────────────────────────
const GEO_CACHE_KEY = 'univinsight_geo_v2';
function getCache() { try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY)) || {}; } catch { return {}; } }
function setCache(c) { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(c)); }

async function geocode(query) {
  const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1&types=place,locality,country,region`);
  const data = await resp.json();
  if (data.features && data.features.length > 0) return data.features[0].geometry.coordinates;
  return null;
}

async function plotMarketsOnMap(items) {
  const features = [];
  const cache = getCache();
  let updated = false;
  const loadingText = document.querySelector('.loading__text');
  const ls = document.getElementById('loading-screen');

  // First, resolve all unique locations
  const uniqueLocs = new Set();
  items.forEach(it => (it.locations || []).forEach(l => uniqueLocs.add(l)));
  const locArr = [...uniqueLocs];

  for (let i = 0; i < locArr.length; i++) {
    const loc = locArr[i];
    if (ls && !ls.classList.contains('loading-screen--hidden') && loadingText && i % 3 === 0) {
      loadingText.textContent = `Resolving locations (${i}/${locArr.length})...`;
    }
    if (!cache[loc]) {
      try {
        const coords = await geocode(loc);
        if (coords) { cache[loc] = coords; updated = true; }
      } catch (e) { /* skip */ }
    }
  }

  if (updated) setCache(cache);

  // Now create features: one dot per location per market
  let marketId = 0;
  for (const item of items) {
    const locs = item.locations || [];
    const resolvedCoords = locs.map(l => cache[l]).filter(Boolean);
    if (!resolvedCoords.length) continue;

    const id = 'mkt_' + (marketId++);
    for (const coords of resolvedCoords) {
      // Add small random offset if same coords to avoid overlap
      const jitter = resolvedCoords.length > 1 ? [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3] : [0, 0];
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [coords[0] + jitter[0], coords[1] + jitter[1]] },
        properties: {
          title: item.title,
          probability: item.probability,
          volume: item.volume,
          image: item.image,
          source: item.source,
          market_id: id,
          end_date: item.end_date,
          top_outcome: item.outcomes && item.outcomes.length > 2
            ? (item.outcomes.reduce((prev, current) => (prev.probability > current.probability) ? prev : current).title)
            : 'YES',
        }
      });
    }
  }

  if (map && map.getSource('markets')) {
    const data = { type: 'FeatureCollection', features };
    map.getSource('markets').setData(data);
    // Store data reference for line queries
    map.getSource('markets')._data = data;
  }
}

// ─── Refresh ─────────────────────────────────────────────────
async function refresh() {
  const data = await fetchHeadlines();
  if (data.headlines) {
    allMarketData = data.headlines;
    initTicker(data.headlines);
    await plotMarketsOnMap(data.headlines);
  }
}

// ─── Boot ────────────────────────────────────────────────────
async function boot() {
  renderApp();
  initTheme();
  initSearch();
  initMap();
  await new Promise(r => { if (map.loaded()) r(); else map.once('load', r); });

  document.querySelector('.loading__text').textContent = 'Fetching all Polymarket events...';
  await refresh();

  document.getElementById('loading-screen').classList.add('loading-screen--hidden');
  setInterval(refresh, 60000);
}

boot();
