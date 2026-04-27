'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, History, Info, Newspaper } from 'lucide-react';
import {
  MarketHeadline, fetchMarketTrades, fetchRelatedInfo, fetchTrends, TrendsResponse,
  fetchCrypto, fetchClimate, fetchSports, fetchFinance, fetchWiki,
  CryptoData, ClimateData, SportsData, FinanceData, WikiData,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import StatsChart from './StatsChart';
import TradeTable from './TradeTable';
import RelatedNews from './RelatedNews';
import WordCloud from './WordCloud';
import SparkChart from './SparkChart';

interface MarketModalProps {
  market: MarketHeadline | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'stats' | 'trades' | 'rules' | 'related';

function fmtVol(val?: number) {
  const n = Number(val || 0);
  if (!n) return '$0';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtCountdown(d?: string) {
  if (!d) return 'N/A';
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? days + 'd ' + hrs + 'h' : hrs + 'h';
}

function fmtPrice(n: number) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  if (n >= 1) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return '$' + n.toFixed(6);
}

function PctBadge({ val }: { val: number | null | undefined }) {
  if (val == null) return <span className="text-slate-400 text-[10px]">--</span>;
  const color = val >= 0 ? 'text-green-600' : 'text-red-500';
  return <span className={`text-[10px] font-bold ${color}`}>{val >= 0 ? '+' : ''}{val.toFixed(1)}%</span>;
}

// Section wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Skeleton() {
  return <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />;
}

export default function MarketModal({ market, isOpen, onClose }: MarketModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [tradesData, setTradesData] = useState<any>(null);
  const [newsData, setNewsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [sportsData, setSportsData] = useState<SportsData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [contextFetched, setContextFetched] = useState(false);
  const [showAllOutcomes, setShowAllOutcomes] = useState(false);
  const [minTrade, setMinTrade] = useState(0);

  // Fetch contextual data using pre-computed categories from market data
  useEffect(() => {
    if (!market || !isOpen || contextFetched) return;
    setContextFetched(true);
    const cats = market.categories || [];
    const entity = market.entity || '';
    if (cats.includes('crypto')) fetchCrypto(market.title).then(setCryptoData).catch(() => {});
    if (cats.includes('climate')) {
      const loc = market.locations?.[0] || entity;
      fetchClimate(40, -100, loc).then(setClimateData).catch(() => {});
    }
    if (cats.includes('sports')) {
      const loc = entity || market.locations?.[0] || '';
      fetchSports(loc).then(setSportsData).catch(() => {});
    }
    if (cats.includes('finance')) fetchFinance(entity).then(setFinanceData).catch(() => {});
    if (entity) fetchWiki(entity).then(setWikiData).catch(() => {});
  }, [market, isOpen, contextFetched]);

  useEffect(() => {
    if (!market || !isOpen) return;
    if (activeTab === 'trades' && !tradesData) {
      setLoadingTrades(true);
      fetchMarketTrades(market.condition_id || '', market.token_id || '')
        .then(res => setTradesData(res)).catch(() => {}).finally(() => setLoadingTrades(false));
    }
    if (activeTab === 'related') {
      if (!newsData) {
        setLoadingNews(true);
        fetchRelatedInfo(market.title).then(res => setNewsData(res)).catch(() => {}).finally(() => setLoadingNews(false));
      }
      if (!trendsData) {
        setLoadingTrends(true);
        fetchTrends(market.title).then(res => setTrendsData(res)).catch(() => {}).finally(() => setLoadingTrends(false));
      }
    }
  }, [activeTab, market, isOpen, newsData, trendsData, tradesData]);

  useEffect(() => {
    setTradesData(null); setNewsData(null); setTrendsData(null);
    setCryptoData(null); setClimateData(null);
    setSportsData(null); setFinanceData(null); setWikiData(null);
    setContextFetched(false);
    setActiveTab('stats'); setShowAllOutcomes(false);
  }, [market?.condition_id]);

  if (!market) return null;

  const yes = market.probability || 0;
  const no = Math.round((100 - yes) * 10) / 10;
  const competitiveness = Math.min(100, Math.round(Math.abs(50 - yes) * 2)) + '%';

  const tabs: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'trades', label: 'Trades', icon: History },
    { id: 'rules', label: 'Rules', icon: Info },
    { id: 'related', label: 'Related Info', icon: Newspaper },
  ];

  const categories = market.categories || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-[100px] left-4 bottom-4 w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl z-[1000] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <img src="/polymarket-icon.png" alt={market.source || 'Polymarket'} className="h-3 w-auto object-contain rounded-[3px]" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">VOL {fmtVol(market.volume)}</span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {market.image && <img src={market.image} alt="" className="w-full h-40 object-cover" />}
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug px-5 pt-4">{market.title}</h3>

              {/* Category badges */}
              {categories.length > 0 && (
                <div className="flex gap-1.5 px-5 pt-2">
                  {categories.map(c => (
                    <span key={c} className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Probability */}
              <div className="px-5 py-3">
                {market.outcomes && market.outcomes.length > 2 ? (
                  <div className="space-y-2">
                    {market.outcomes.map((o, i) => (
                      <div key={i} className={cn(i >= 2 && !showAllOutcomes && "hidden")}>
                        <div className="flex justify-between items-center text-[11px] mb-0.5">
                          <span className="font-bold text-green-600">Yes {o.probability}%</span>
                          <span className="font-semibold text-slate-500 text-center flex-1 truncate px-2">{o.title}</span>
                          <span className="font-bold text-red-500">No {Math.round((100 - o.probability) * 10) / 10}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500" style={{ width: `${o.probability}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${100 - o.probability}%` }} />
                        </div>
                      </div>
                    ))}
                    {market.outcomes.length > 2 && !showAllOutcomes && (
                      <button onClick={() => setShowAllOutcomes(true)} className="w-full mt-2 py-1.5 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all">
                        See more (+{market.outcomes.length - 2})
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="h-[6px] w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${yes}%` }} />
                      <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${no}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] font-bold text-green-600">YES {yes}%</span>
                      <span className="text-[10px] font-bold text-red-500">NO {no}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-5">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors border-b-2 ${activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5 min-h-[300px]">
                {activeTab === 'stats' && (
                  <div>
                    <StatsChart tokenId={market.token_id} />
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2">
                      {[
                        { label: '24H Volume', value: fmtVol(market.volume) },
                        { label: 'Liquidity', value: fmtVol(market.liquidity) },
                        { label: '1W Volume', value: fmtVol(market.volume) },
                        { label: 'Competitiveness', value: competitiveness },
                        { label: '1M Volume', value: fmtVol(market.volume) },
                        { label: 'Closes In', value: fmtCountdown(market.end_date) },
                      ].map((stat, i) => (
                        <div key={i} className={`py-3 ${i % 2 === 0 ? 'pr-4' : 'pl-4 border-l border-slate-100 dark:border-slate-800'} border-b border-slate-100 dark:border-slate-800`}>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                          <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mt-0.5">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'trades' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Min Trade</span>
                      {[{ label: 'All', val: 0 }, { label: '$10', val: 10 }, { label: '$100', val: 100 }, { label: '$1K', val: 1000 }].map((f) => (
                        <button key={f.val} onClick={() => setMinTrade(f.val)}
                          className={cn("px-2 py-1 text-[10px] font-bold rounded transition-colors whitespace-nowrap", minTrade === f.val ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                          {f.label}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">$</span>
                        <input type="text" inputMode="numeric" placeholder="Custom"
                          className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 dark:text-slate-300 w-12"
                          onChange={(e) => setMinTrade(Number(e.target.value) || 0)} />
                      </div>
                    </div>
                    <TradeTable trades={tradesData?.trades || []} isLoading={loadingTrades} minTrade={minTrade} />
                  </div>
                )}

                {activeTab === 'rules' && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                    {market.description || 'No rules available for this market.'}
                  </div>
                )}

                {activeTab === 'related' && (
                  <div className="space-y-6">
                    {/* Crypto Section */}
                    {cryptoData?.found && cryptoData.summary && (
                      <Section title={`${cryptoData.summary.name} (${cryptoData.summary.symbol})`}>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3 mb-3">
                            {cryptoData.summary.image && <img src={cryptoData.summary.image} className="w-8 h-8 rounded-full" alt="" />}
                            <div>
                              <div className="text-lg font-bold text-slate-900 dark:text-white">{fmtPrice(cryptoData.summary.current_price)}</div>
                              <div className="flex gap-2">
                                <span className="text-[9px] text-slate-400">24h</span><PctBadge val={cryptoData.summary.price_change_24h} />
                                <span className="text-[9px] text-slate-400">7d</span><PctBadge val={cryptoData.summary.price_change_7d} />
                                <span className="text-[9px] text-slate-400">30d</span><PctBadge val={cryptoData.summary.price_change_30d} />
                              </div>
                            </div>
                          </div>
                          {cryptoData.sparkline && cryptoData.sparkline.length > 2 && (
                            <div className="mt-4">
                              <SparkChart 
                                data={cryptoData.sparkline} 
                                color="#4f46e5" 
                                height={60} 
                                prefix="$"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                            <div><span className="text-slate-400">MCap</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{fmtPrice(cryptoData.summary.market_cap)}</span></div>
                            <div><span className="text-slate-400">Vol 24h</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{fmtPrice(cryptoData.summary.total_volume)}</span></div>
                            <div><span className="text-slate-400">ATH</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{fmtPrice(cryptoData.summary.ath)}</span></div>
                          </div>
                        </div>
                      </Section>
                    )}

                    {/* Climate Section */}
                    {climateData?.current && (
                      <Section title="Weather & Climate">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-2 gap-3 text-[11px]">
                            <div><span className="text-slate-400">Temperature</span><br /><span className="text-xl font-bold text-slate-900 dark:text-white">{climateData.current.temperature}C</span></div>
                            <div><span className="text-slate-400">Feels Like</span><br /><span className="text-xl font-bold text-slate-900 dark:text-white">{climateData.current.feels_like}C</span></div>
                            <div><span className="text-slate-400">Humidity</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{climateData.current.humidity}%</span></div>
                            <div><span className="text-slate-400">Wind</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{climateData.current.wind_speed} km/h</span></div>
                          </div>
                          {climateData.forecast && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-3">7-Day High Temp Forecast</div>
                              <SparkChart 
                                data={climateData.forecast.temp_max} 
                                labels={climateData.forecast.dates.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' }))}
                                color="#f97316" 
                                height={50}
                                prefix=""
                              />
                            </div>
                          )}
                        </div>
                      </Section>
                    )}

                    {/* Sports Section */}
                    {sportsData && sportsData.teams.length > 0 && (
                      <Section title="Related Teams">
                        <div className="space-y-2">
                          {sportsData.teams.slice(0, 4).map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              {t.logo && <img src={t.logo} className="w-10 h-10 object-contain" alt="" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{t.name}</div>
                                <div className="text-[10px] text-slate-400">{t.sport} — {t.league}</div>
                                {t.stadium && <div className="text-[9px] text-slate-400">{t.stadium}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Finance Section */}
                    {financeData && Object.keys(financeData.series).length > 0 && (
                      <Section title="Economic Indicators">
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(financeData.series).map(([name, data]) => (
                            <div key={name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{name}</div>
                                  <div className="text-[16px] font-bold text-slate-900 dark:text-white">
                                    {data.values.length > 0 ? data.values[data.values.length - 1].toLocaleString() : '--'}
                                  </div>
                                </div>
                                <div className="text-[9px] text-slate-400 text-right">
                                  Latest: {data.dates.length > 0 ? data.dates[data.dates.length - 1] : ''}
                                </div>
                              </div>
                              <SparkChart 
                                data={data.values} 
                                labels={data.dates}
                                color="#10b981" 
                                height={40}
                              />
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Wikipedia Section */}
                    {wikiData?.found && wikiData.extract && (
                      <Section title="Background">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                          {wikiData.thumbnail && <img src={wikiData.thumbnail} className="w-full h-24 object-cover rounded-lg mb-3" alt="" />}
                          <div className="text-[12px] font-bold text-slate-900 dark:text-white mb-1">{wikiData.title}</div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">{wikiData.extract}</p>
                          {wikiData.url && (
                            <a href={wikiData.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[10px] font-bold text-indigo-600 hover:underline">
                              Read more on Wikipedia
                            </a>
                          )}
                        </div>
                      </Section>
                    )}

                    {/* Trends */}
                    <Section title="Search Trends">
                      {loadingTrends ? <Skeleton /> : trendsData && trendsData.related_queries?.length > 0 ? (
                        <WordCloud words={trendsData.related_queries} />
                      ) : (
                        <div className="h-24 bg-slate-50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-400">
                          No trending data available
                        </div>
                      )}
                    </Section>

                    {/* News */}
                    <Section title="Related News">
                      <RelatedNews data={newsData} isLoading={loadingNews} />
                    </Section>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
