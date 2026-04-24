/**
 * UnivInsight — API Client
 * Fetches data from the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

export async function fetchMarket(location, country = '') {
  const params = new URLSearchParams({ location, country });
  return fetchJSON(`${API_BASE}/market?${params}`);
}

export async function fetchFinance(location, country = '') {
  const params = new URLSearchParams({ location, country });
  return fetchJSON(`${API_BASE}/finance?${params}`);
}

export async function fetchClimate(lat, lng, location = '') {
  const params = new URLSearchParams({ lat, lng, location });
  return fetchJSON(`${API_BASE}/climate?${params}`);
}

export async function fetchSports(location, country = '') {
  const params = new URLSearchParams({ location, country });
  return fetchJSON(`${API_BASE}/sports?${params}`);
}

export async function fetchTrends(location) {
  return fetchJSON(`${API_BASE}/trends?location=${encodeURIComponent(location)}`);
}

export async function fetchHeadlines() {
  return fetchJSON(`${API_BASE}/market/headlines`);
}
