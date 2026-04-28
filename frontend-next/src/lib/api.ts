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
  categories?: string[];
  entity?: string;
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

export interface RelatedNewsItem {
  title: string;
  url: string;
  description: string;
  image?: string;
  site?: string;
  published?: string;
}

export interface RelatedInfo {
  articles: RelatedNewsItem[];
  total: number;
  query_used?: string;
  error?: string;
}

export interface TrendsResponse {
  location: string;
  interest_over_time: {
    dates: string[];
    values: number[];
  } | null;
  related_queries: string[];
  error?: string | null;
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

export async function fetchRelatedInfo(marketTitle: string): Promise<RelatedInfo> {
  return fetchJSON<RelatedInfo>(`${API_BASE}/news/related?q=${encodeURIComponent(marketTitle)}`);
}

export async function fetchTrends(query: string): Promise<TrendsResponse> {
  return fetchJSON<TrendsResponse>(`${API_BASE}/trends?location=${encodeURIComponent(query)}`);
}

// ─── Context Detection ───
export interface ContextDetection {
  title: string;
  categories: string[];
  entity: string;
}

export async function fetchContext(title: string): Promise<ContextDetection> {
  return fetchJSON<ContextDetection>(`${API_BASE}/context?q=${encodeURIComponent(title)}`);
}

// ─── Climate ───
export interface ClimateData {
  location: string;
  current: {
    temperature: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather_code: number;
  } | null;
  forecast: {
    dates: string[];
    temp_max: number[];
    temp_min: number[];
    precipitation: number[];
    weather_codes: number[];
  } | null;
  historical: {
    dates: string[];
    temp_max: number[];
    temp_min: number[];
    precipitation: number[];
  } | null;
}

export async function fetchClimate(lat: number, lng: number, location: string): Promise<ClimateData> {
  return fetchJSON<ClimateData>(`${API_BASE}/climate?lat=${lat}&lng=${lng}&location=${encodeURIComponent(location)}`);
}

// ─── Sports ───
export interface SportsTeam {
  name: string;
  sport: string;
  league: string;
  logo: string;
  stadium: string;
  year_formed: string;
}

export interface SportsData {
  location: string;
  teams: SportsTeam[];
}

export async function fetchSports(location: string): Promise<SportsData> {
  return fetchJSON<SportsData>(`${API_BASE}/sports?location=${encodeURIComponent(location)}`);
}

// ─── Finance ───
export interface FinanceData {
  location: string;
  series: Record<string, { dates: string[]; values: number[] }>;
  stock: { dates: string[]; values: number[] } | null;
}

export async function fetchFinance(location: string): Promise<FinanceData> {
  return fetchJSON<FinanceData>(`${API_BASE}/finance?location=${encodeURIComponent(location)}`);
}

// ─── Crypto ───
export interface CryptoData {
  found: boolean;
  coin_id: string | null;
  summary: {
    name: string;
    symbol: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    price_change_24h: number;
    price_change_7d: number;
    price_change_30d: number;
    high_24h: number;
    low_24h: number;
    total_volume: number;
    circulating_supply: number;
    max_supply: number | null;
    ath: number;
    ath_change_pct: number;
  } | null;
  sparkline: number[] | null;
  error?: string;
}

export async function fetchCrypto(query: string): Promise<CryptoData> {
  return fetchJSON<CryptoData>(`${API_BASE}/crypto?q=${encodeURIComponent(query)}`);
}

// ─── Wikipedia ───
export interface WikiData {
  found: boolean;
  title: string | null;
  extract: string | null;
  thumbnail: string | null;
  url: string | null;
  error?: string;
}

export async function fetchWiki(query: string): Promise<WikiData> {
  return fetchJSON<WikiData>(`${API_BASE}/wiki?q=${encodeURIComponent(query)}`);
}
export async function fetchAgentChat(message: string, context: any): Promise<{ response: string }> {
  const resp = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });
  if (!resp.ok) throw new Error('Agent communication failed');
  return resp.json();
}
