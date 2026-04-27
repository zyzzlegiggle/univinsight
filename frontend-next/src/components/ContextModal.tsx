'use client';

import React, { useState, useEffect } from 'react';
import { Newspaper, TrendingUp, Info } from 'lucide-react';
import {
  MarketHeadline, fetchRelatedInfo, fetchTrends, TrendsResponse,
  fetchCrypto, fetchClimate, fetchSports, fetchFinance, fetchWiki,
  CryptoData, ClimateData, SportsData, FinanceData, WikiData,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import RelatedNews from './RelatedNews';
import WordCloud from './WordCloud';
import SparkChart from './SparkChart';

interface ContextModalProps {
  market: MarketHeadline | null;
  isOpen: boolean;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-[2px] w-4 bg-indigo-500 rounded-full" />
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />;
}

export default function ContextModal({ market, isOpen }: ContextModalProps) {
  const [newsData, setNewsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [sportsData, setSportsData] = useState<SportsData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [contextFetched, setContextFetched] = useState(false);

  useEffect(() => {
    if (!market || !isOpen || contextFetched) return;
    setContextFetched(true);

    const cats = market.categories || [];
    const entity = market.entity || '';

    // Main related info
    setLoadingNews(true);
    fetchRelatedInfo(market.title).then(setNewsData).catch(() => { }).finally(() => setLoadingNews(false));
    
    setLoadingTrends(true);
    fetchTrends(market.title).then(setTrendsData).catch(() => { }).finally(() => setLoadingTrends(false));

    // Category specific
    if (cats.includes('crypto')) fetchCrypto(market.title).then(setCryptoData).catch(() => { });
    if (cats.includes('climate')) {
      const loc = market.locations?.[0] || entity;
      fetchClimate(40, -100, loc).then(setClimateData).catch(() => { });
    }
    if (cats.includes('sports')) {
      const loc = entity || market.locations?.[0] || '';
      fetchSports(loc).then(setSportsData).catch(() => { });
    }
    if (cats.includes('finance')) fetchFinance(entity).then(setFinanceData).catch(() => { });
    if (entity) fetchWiki(entity).then(setWikiData).catch(() => { });
  }, [market, isOpen, contextFetched]);

  useEffect(() => {
    setNewsData(null); setTrendsData(null);
    setCryptoData(null); setClimateData(null);
    setSportsData(null); setFinanceData(null); setWikiData(null);
    setContextFetched(false);
  }, [market?.condition_id]);

  if (!market) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className="fixed top-[100px] right-4 bottom-4 w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl z-[1000] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">Related Intelligence</span>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
            {/* Wikipedia / Background */}
            {wikiData?.found && wikiData.extract && (
              <Section title="Market Context">
                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
                  {wikiData.thumbnail && <img src={wikiData.thumbnail} className="w-full h-32 object-cover rounded-xl mb-4 shadow-sm" alt="" />}
                  <div className="text-[14px] font-bold text-slate-900 dark:text-white mb-2">{wikiData.title}</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{wikiData.extract}</p>
                  {wikiData.url && (
                    <a href={wikiData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 transition-colors uppercase tracking-wider">
                      Full Intelligence Report →
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* Financial Data */}
            {financeData && Object.keys(financeData.series).length > 0 && (
              <Section title="Economic Indicators">
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(financeData.series).map(([name, data]) => (
                    <div key={name} className="p-5 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">{name}</div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {data.values.length > 0 ? data.values[data.values.length - 1].toLocaleString() : '--'}
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold text-slate-500">
                          LATEST: {data.dates[data.dates.length - 1]}
                        </div>
                      </div>
                      <SparkChart
                        data={data.values}
                        labels={data.dates}
                        color="#10b981"
                        height={60}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Crypto Data */}
            {cryptoData?.found && cryptoData.summary && (
              <Section title={`Asset: ${cryptoData.summary.name}`}>
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {cryptoData.summary.image && <img src={cryptoData.summary.image} className="w-10 h-10 rounded-full bg-white/10 p-1" alt="" />}
                      <div>
                        <div className="text-[10px] opacity-70 font-bold uppercase tracking-wider">{cryptoData.summary.symbol} / USD</div>
                        <div className="text-2xl font-black">{fmtPrice(cryptoData.summary.current_price)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] opacity-70 font-bold uppercase mb-1">24H CHANGE</div>
                      <div className={`text-sm font-black ${cryptoData.summary.price_change_24h >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {cryptoData.summary.price_change_24h >= 0 ? '+' : ''}{cryptoData.summary.price_change_24h?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  {cryptoData.sparkline && (
                    <SparkChart
                      data={cryptoData.sparkline}
                      color="#ffffff"
                      height={60}
                      prefix="$"
                    />
                  )}
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-[10px]">
                    <div><div className="opacity-60 mb-1 font-bold">MARKET CAP</div><div className="font-black">{fmtPrice(cryptoData.summary.market_cap)}</div></div>
                    <div><div className="opacity-60 mb-1 font-bold">VOLUME</div><div className="font-black">{fmtPrice(cryptoData.summary.total_volume)}</div></div>
                    <div><div className="opacity-60 mb-1 font-bold">ALL TIME HIGH</div><div className="font-black">{fmtPrice(cryptoData.summary.ath)}</div></div>
                  </div>
                </div>
              </Section>
            )}

            {/* Climate Section */}
            {climateData?.current && (
              <Section title="Geographic Weather">
                <div className="bg-amber-500 rounded-2xl p-6 text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-widest mb-1">Current Condition</div>
                      <div className="text-4xl font-black">{climateData.current.temperature}°C</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] opacity-80 font-bold uppercase mb-1">Humidity</div>
                      <div className="text-lg font-black">{climateData.current.humidity}%</div>
                    </div>
                  </div>
                  {climateData.forecast && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="text-[10px] font-black uppercase mb-4 opacity-80">7-Day High Forecast</div>
                      <SparkChart
                        data={climateData.forecast.temp_max}
                        labels={climateData.forecast.dates.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' }))}
                        color="#ffffff"
                        height={50}
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Search Trends */}
            <Section title="Social & Search Trends">
              {loadingTrends ? <Skeleton /> : trendsData && trendsData.related_queries?.length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
                  <WordCloud words={trendsData.related_queries} />
                </div>
              ) : (
                <div className="h-32 bg-slate-50 dark:bg-slate-800/30 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  No Trending Intelligence
                </div>
              )}
            </Section>

            {/* News */}
            <Section title="Related News Intelligence">
              <RelatedNews data={newsData} isLoading={loadingNews} />
            </Section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
