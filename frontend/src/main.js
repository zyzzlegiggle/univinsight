import './style.css';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { openModal } from './components/modal.js';
import { fetchHeadlines } from './services/api.js';

// ─── Mapbox Access Token ───────────────────────────────────────
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let map;
let geocoder;

// ─── Render the App Shell ──────────────────────────────────────
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Loading Screen -->
    <div class="loading-screen" id="loading-screen">
      <div class="loading__spinner"></div>
      <div class="loading__text">Initializing Map…</div>
    </div>

    <!-- Header -->
    <header class="header">
      <div class="header__brand">
        <div class="header__logo">U</div>
        <div>
          <div class="header__title">UnivInsight</div>
          <div class="header__subtitle">Universal Insight</div>
        </div>
      </div>
      <div class="header__search" id="geocoder-container"></div>
      <div class="header__actions">
        <button class="theme-toggle" id="theme-toggle" title="Toggle Light/Dark Mode">
          <svg class="theme-toggle__icon--sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg class="theme-toggle__icon--moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
      </div>
    </header>

    <!-- Ticker -->
    <div class="ticker" id="ticker-container">
      <div class="ticker__track" id="ticker-track">
        <div class="ticker__loading">Loading market trends…</div>
      </div>
    </div>

    <!-- Main Layout -->
    <main class="main">
      <div class="map-container" id="map-container">
        <div id="map" style="width:100%;height:100%;"></div>
      </div>
    </main>
  `;
}

// ─── Ticker Logic ─────────────────────────────────────────────
async function initTicker() {
  const track = document.getElementById('ticker-track');
  try {
    const data = await fetchHeadlines();
    const items = data.headlines || [];
    
    if (items.length === 0) {
      track.innerHTML = '<div class="ticker__item">No active market trends available</div>';
      return;
    }

    const html = items.map(item => {
      const change = item.change || 0;
      const changeClass = change >= 0 ? 'ticker__change--up' : 'ticker__change--down';
      const changeSign = change >= 0 ? '▲' : '▼';
      
      return `
        <a href="${item.url}" target="_blank" class="ticker__item">
          <img src="/polymarket-icon.png" class="ticker__logo" alt="Polymarket" />
          ${item.image ? `<img src="${item.image}" class="ticker__img" />` : ''}
          <span class="ticker__title">${item.title}</span>
          <span class="ticker__prob">${item.probability}%</span>
          <span class="ticker__change ${changeClass}">${changeSign} ${Math.abs(change)}%</span>
        </a>
      `;
    }).join('');

    // Double for infinite scroll
    track.innerHTML = html + html;

    // Clone for infinite scroll effect if needed, but for now just flex
  } catch (err) {
    track.innerHTML = '<div class="ticker__item">Market data unavailable</div>';
  }
}

// ─── Theme Logic ─────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  });
}

// ─── Initialize Mapbox ─────────────────────────────────────────
function initMap() {
  // Always use light mode for the map
  const style = 'mapbox://styles/mapbox/streets-v12';

  map = new mapboxgl.Map({
    container: 'map',
    style: style,
    center: [0, 20],
    zoom: 2,
    antialias: true,
    projection: 'globe',
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  // ── Geocoder ─────────────────────────────────
  geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl,
    placeholder: 'Search for cities or places…',
    types: 'place,locality,neighborhood',
    flyTo: { bearing: 0, speed: 1.2, curve: 1.4, essential: true },
  });

  const container = document.getElementById('geocoder-container');
  if (container) container.appendChild(geocoder.onAdd(map));

  // When a result is selected → open the modal
  geocoder.on('result', (e) => {
    const feat = e.result;
    const [lng, lat] = feat.center;
    const name = feat.text || feat.place_name || 'Unknown';

    // Extract country from context
    let country = '';
    if (feat.context) {
      const countryCtx = feat.context.find(c => c.id.startsWith('country'));
      if (countryCtx) country = countryCtx.text;
    }

    // Add a marker at the selected location
    new mapboxgl.Marker({ color: '#4f46e5' })
      .setLngLat([lng, lat])
      .addTo(map);

    // Open insight modal
    openModal({ name, lat, lng, country });
  });

  // On map load
  map.on('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('loading-screen--hidden');

    map.setFog({
      color: 'rgb(255, 255, 255)',
      'high-color': 'rgb(200, 230, 255)',
      'horizon-blend': 0.05,
      'space-color': 'rgb(240, 245, 255)',
      'star-intensity': 0,
    });
  });
}

// ─── Boot ──────────────────────────────────────────────────────
renderApp();
initTheme();
initMap();
initTicker();
