'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import {
  MarketHeadline, fetchRelatedInfo, fetchTrends, TrendsResponse,
  fetchCrypto, fetchClimate, fetchSports, fetchFinance, fetchWiki,
  fetchSentiment, fetchPolitics, fetchOdds,
  CryptoData, ClimateData, SportsData, FinanceData, WikiData,
  SentimentData, PoliticsData, OddsData,
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import RelatedNews from './RelatedNews';
import WordCloud from './WordCloud';
import SparkChart from './SparkChart';
import MarketAgent from './MarketAgent';

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

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="mb-6 last:mb-0 border-b border-slate-100 dark:border-slate-800/50 pb-6 last:border-0 last:pb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full mb-4 group hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <div className="h-[2px] w-3 bg-indigo-500 rounded-full" />
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{title}</h4>
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3 text-slate-300" /> : <ChevronDown className="w-3 h-3 text-slate-300" />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FullModalSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full" />
        </div>
      ))}
    </div>
  );
}

export default function ContextModal({ market, isOpen }: ContextModalProps) {
  const [newsData, setNewsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [sportsData, setSportsData] = useState<SportsData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [politicsData, setPoliticsData] = useState<PoliticsData | null>(null);
  const [oddsData, setOddsData] = useState<OddsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contextFetched, setContextFetched] = useState(false);
  const [showChatButton, setShowChatButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToChat = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowChatButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (!isLoading && isOpen) {
      // Small delay to ensure scrollHeight is accurate after render
      const timer = setTimeout(() => {
        handleScroll();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isOpen, newsData]); // Re-check when data changes

  useEffect(() => {
    if (!market || !isOpen || contextFetched) return;
    setContextFetched(true);
    setIsLoading(true);

    const cats = market.categories || [];
    const entity = market.entity || '';

    const promises: Promise<any>[] = [
      fetchRelatedInfo(market.title).then(setNewsData).catch(() => { }),
      fetchTrends(market.title).then(setTrendsData).catch(() => { }),
      fetchSentiment(market.title).then(setSentimentData).catch(() => { }),
    ];

    if (cats.includes('crypto')) promises.push(fetchCrypto(market.title).then(setCryptoData).catch(() => { }));
    if (cats.includes('climate')) {
      const loc = market.locations?.[0] || entity;
      promises.push(fetchClimate(40, -100, loc).then(setClimateData).catch(() => { }));
    }
    if (cats.includes('sports')) {
      const loc = entity || market.locations?.[0] || '';
      promises.push(fetchSports(loc).then(setSportsData).catch(() => { }));
      promises.push(fetchOdds(market.title).then(setOddsData).catch(() => { }));
    }
    if (cats.includes('finance')) promises.push(fetchFinance(entity).then(setFinanceData).catch(() => { }));
    if (cats.includes('politics')) promises.push(fetchPolitics(market.title).then(setPoliticsData).catch(() => { }));
    if (entity) promises.push(fetchWiki(entity).then(setWikiData).catch(() => { }));

    Promise.allSettled(promises).then(() => {
      // Add a slight delay for smooth transition
      setTimeout(() => setIsLoading(false), 400);
    });
  }, [market, isOpen, contextFetched]);

  useEffect(() => {
    setNewsData(null); setTrendsData(null);
    setCryptoData(null); setClimateData(null);
    setSportsData(null); setFinanceData(null); setWikiData(null);
    setSentimentData(null); setPoliticsData(null); setOddsData(null);
    setContextFetched(false);
  }, [market?.condition_id]);

  if (!market) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={market.condition_id}
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
              <span className="text-[11px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">Analysis</span>
            </div>
            <div className="flex gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full bg-green-500", isLoading ? "animate-ping" : "animate-pulse")} />
              <div className={cn("w-1.5 h-1.5 rounded-full bg-indigo-500", isLoading ? "animate-ping" : "animate-pulse")} />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <FullModalSkeleton />
          ) : (
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar"
            >
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
                    {/* Fear & Greed Badge */}
                    {cryptoData.fear_greed && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="text-[10px] opacity-70 font-bold uppercase">Market Sentiment</div>
                        <div className="px-3 py-1 bg-white/20 rounded-full text-[11px] font-black">
                          {cryptoData.fear_greed.label} ({cryptoData.fear_greed.value}/100)
                        </div>
                      </div>
                    )}
                  </div>
                  {/* DeFi TVL */}
                  {cryptoData.defi_tvl && (
                    <div className="mt-4 p-5 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">DeFi TVL — {cryptoData.defi_tvl.chain}</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">{fmtPrice(cryptoData.defi_tvl.current_tvl)}</div>
                      </div>
                      <SparkChart data={cryptoData.defi_tvl.values} color="#8b5cf6" height={50} prefix="$" />
                    </div>
                  )}
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
                  {/* NASA EONET Natural Events */}
                  {climateData.natural_events?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Active Natural Events</div>
                      {climateData.natural_events.slice(0, 5).map((evt, i) => (
                        <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                          <div className="text-[11px] font-bold text-red-700 dark:text-red-400">{evt.title}</div>
                          <div className="text-[9px] text-red-500 mt-1">{evt.categories.join(', ')} — {evt.date?.split('T')[0]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* World Bank Indicators */}
              {financeData?.world_bank && Object.keys(financeData.world_bank).length > 0 && (
                <Section title="Country Indicators (World Bank)" defaultOpen={false}>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(financeData.world_bank).map(([name, d]) => (
                      <div key={name} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-widest mb-1">{name}</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {typeof d.latest_value === 'number' 
                            ? d.latest_value > 1e9 ? fmtPrice(d.latest_value) 
                              : d.latest_value > 1000 ? d.latest_value.toLocaleString()
                              : d.latest_value.toFixed(2)
                            : d.latest_value}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">{d.country} — {d.year}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Politics: Congress Bills */}
              {politicsData && politicsData.bills?.length > 0 && (
                <Section title="Related Legislation" defaultOpen={false}>
                  <div className="space-y-2">
                    {politicsData.bills.slice(0, 5).map((bill, i) => (
                      <a key={i} href={bill.url} target="_blank" rel="noopener noreferrer"
                        className="block p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30 hover:border-violet-300 dark:hover:border-violet-600 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 rounded text-[9px] font-black">{bill.number}</span>
                          <span className="text-[9px] text-slate-400">{bill.origin_chamber}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-snug">{bill.title}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{bill.latest_action} — {bill.action_date}</div>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Sports Odds */}
              {oddsData && oddsData.events?.length > 0 && (
                <Section title="Bookmaker Odds" defaultOpen={false}>
                  <div className="space-y-2">
                    {oddsData.events.slice(0, 5).map((evt, i) => (
                      <div key={i} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
                        <div className="text-[9px] text-orange-500 uppercase font-black tracking-widest mb-1">{evt.sport}</div>
                        <div className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{evt.home} vs {evt.away}</div>
                        <div className="flex gap-3 mt-2">
                          {Object.entries(evt.odds).map(([team, odd]) => (
                            <span key={team} className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                              {team}: <span className={Number(odd) > 0 ? 'text-green-600' : 'text-red-500'}>{Number(odd) > 0 ? '+' : ''}{odd}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Media Sentiment (GDELT Tone) */}
              {sentimentData?.found && sentimentData.values.length > 0 && (
                <Section title="Media Sentiment" defaultOpen={false}>
                  <div className="p-5 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Average Media Tone</div>
                        <div className={`text-2xl font-black ${sentimentData.avg_tone >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {sentimentData.avg_tone >= 0 ? '+' : ''}{sentimentData.avg_tone.toFixed(2)}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
                        sentimentData.avg_tone > 1 ? 'bg-green-100 text-green-700' :
                        sentimentData.avg_tone < -1 ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {sentimentData.avg_tone > 1 ? 'Positive' : sentimentData.avg_tone < -1 ? 'Negative' : 'Neutral'}
                      </div>
                    </div>
                    <SparkChart data={sentimentData.values} color={sentimentData.avg_tone >= 0 ? '#10b981' : '#ef4444'} height={50} />
                  </div>
                </Section>
              )}

              {/* News */}
              <Section 
                title="Related News Intelligence" 
                defaultOpen={newsData && newsData.articles && newsData.articles.length > 0}
              >
                <RelatedNews data={newsData} isLoading={false} />
              </Section>

              {/* Search Trends */}
              <Section 
                title="Social & Search Trends"
                defaultOpen={trendsData && trendsData.related_queries && trendsData.related_queries.length > 0}
              >
                {trendsData && trendsData.related_queries?.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
                    <WordCloud words={trendsData.related_queries} />
                  </div>
                ) : (
                  <div className="h-32 bg-slate-50 dark:bg-slate-800/30 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    No Trending Intelligence
                  </div>
                )}
              </Section>

              {/* AI Agent Chat */}
              <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-[2px] w-4 bg-indigo-500 rounded-full" />
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Prediction Helper</h4>
                </div>
                <MarketAgent
                  market={market}
                  context={{
                    news: newsData,
                    trends: trendsData,
                    crypto: cryptoData,
                    climate: climateData,
                    finance: financeData,
                    wiki: wikiData,
                    sentiment: sentimentData,
                    politics: politicsData,
                    odds: oddsData,
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Floating Chat Button */}
          <AnimatePresence>
            {!isLoading && showChatButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={scrollToChat}
                className="absolute bottom-8 right-8 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95 group z-[1001]"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="absolute right-full mr-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Jump to Chat
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
