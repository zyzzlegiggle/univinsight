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

export async function fetchHeadlines() {
  return fetchJSON(`${API_BASE}/market/headlines`);
}

export async function fetchPriceHistory(tokenId, interval = '1d') {
  const params = new URLSearchParams({ token_id: tokenId || '', interval });
  return fetchJSON(`${API_BASE}/market/price-history?${params}`);
}

export async function fetchMarketTrades(conditionId, tokenId) {
  const params = new URLSearchParams({
    condition_id: conditionId || '',
    token_id: tokenId || '',
  });
  return fetchJSON(`${API_BASE}/market/trades?${params}`);
}

export async function fetchRelatedInfo(query) {
  const params = new URLSearchParams({ q: query });
  return fetchJSON(`${API_BASE}/news/related?${params}`);
}

