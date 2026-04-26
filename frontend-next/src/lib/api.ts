/**
 * UnivInsight — API Client (Next.js/TypeScript)
 * Uses Next.js rewrites to proxy to the backend — no CORS issues.
 */

const API_BASE = '/api';

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API ${resp.status}: ${resp.statusText}`);

  const text = await resp.text();
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`JSON Parse Error at URL: ${url}`);
    console.error(`Response length: ${text.length}`);
    console.error(`First 200 chars: ${text.substring(0, 200)}`);
    console.error(`Last 200 chars: ${text.substring(text.length - 200)}`);
    throw e;
  }
}

export interface MarketHeadline {
  title: string;
  probability: number;
  image?: string;
  url?: string;
  source?: string;
  volume?: number;
  end_date?: string;
  token_id?: string;
  condition_id?: string;
  liquidity?: number;
  description?: string;
  outcomes?: Array<{ title: string; probability: number; token_id?: string; condition_id?: string }>;
  locations?: string[];
  top_outcome?: string;
}

export interface PriceHistory {
  history: Array<{ t: number; p: string }>;
}

export interface Trade {
  time: string;
  side: string;
  value: number;
  price: number;
  position: string;
}

export interface MarketTrades {
  trades: Trade[];
}

export interface RelatedInfo {
  articles: Array<{
    title: string;
    url: string;
    image?: string;
    site?: string;
    published?: string;
    description?: string;
  }>;
}

export async function fetchHeadlines(): Promise<MarketHeadline[]> {
  const data = await fetchJSON<{ headlines: MarketHeadline[] }>(`${API_BASE}/market/headlines`);
  return data.headlines || [];
}

export async function fetchPriceHistory(tokenId: string, interval = '1d'): Promise<PriceHistory> {
  const params = new URLSearchParams({ token_id: tokenId || '', interval });
  return fetchJSON<PriceHistory>(`${API_BASE}/market/price-history?${params}`);
}

export async function fetchMarketTrades(conditionId: string, tokenId: string): Promise<MarketTrades> {
  const params = new URLSearchParams({
    condition_id: conditionId || '',
    token_id: tokenId || '',
  });
  return fetchJSON<MarketTrades>(`${API_BASE}/market/trades?${params}`);
}

export async function fetchRelatedInfo(query: string): Promise<RelatedInfo> {
  const params = new URLSearchParams({ q: query });
  return fetchJSON<RelatedInfo>(`${API_BASE}/news/related?${params}`);
}
