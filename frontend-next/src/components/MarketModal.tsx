'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, History, Info, Newspaper } from 'lucide-react';
import { MarketHeadline, fetchMarketTrades, fetchRelatedInfo, fetchTrends, TrendsResponse } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import StatsChart from './StatsChart';
import TradeTable from './TradeTable';
import RelatedNews from './RelatedNews';
import WordCloud from './WordCloud';

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

export default function MarketModal({ market, isOpen, onClose }: MarketModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [tradesData, setTradesData] = useState<any>(null);
  const [newsData, setNewsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [showAllOutcomes, setShowAllOutcomes] = useState(false);
  const [minTrade, setMinTrade] = useState(0);

  useEffect(() => {
    if (!market || !isOpen) return;

    if (activeTab === 'trades' && !tradesData) {
      setLoadingTrades(true);
      fetchMarketTrades(market.condition_id || '', market.token_id || '')
        .then(res => setTradesData(res))
        .catch(e => console.error(e))
        .finally(() => setLoadingTrades(false));
    }

    if (activeTab === 'related') {
      if (!newsData) {
        setLoadingNews(true);
        fetchRelatedInfo(market.title)
          .then(res => setNewsData(res))
          .catch(e => console.error(e))
          .finally(() => setLoadingNews(false));
      }
      if (!trendsData) {
        setLoadingTrends(true);
        fetchTrends(market.title)
          .then(res => setTrendsData(res))
          .catch(e => console.error(e))
          .finally(() => setLoadingTrends(false));
      }
    }
  }, [activeTab, market, isOpen, newsData, trendsData, tradesData]);

  // Reset when market changes
  useEffect(() => {
    setTradesData(null);
    setNewsData(null);
    setTrendsData(null);
    setActiveTab('stats');
    setShowAllOutcomes(false);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-[100px] left-4 bottom-4 w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl z-[1000] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <img 
                  src="/polymarket-icon.png" 
                  alt={market.source || 'Polymarket'} 
                  className="h-3 w-auto object-contain rounded-[3px]" 
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  VOL {fmtVol(market.volume)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Image */}
              {market.image && (
                <img src={market.image} alt="" className="w-full h-40 object-cover" />
              )}

              {/* Title */}
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug px-5 pt-4">
                {market.title}
              </h3>

              {/* Probability Bar */}
              <div className="px-5 py-3">
                {market.outcomes && market.outcomes.length > 2 ? (
                  /* Multi-choice outcomes */
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
                      <button 
                        onClick={() => setShowAllOutcomes(true)}
                        className="w-full mt-2 py-1.5 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all"
                      >
                        See more (+{market.outcomes.length - 2})
                      </button>
                    )}
                  </div>
                ) : (
                  /* Binary market */
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
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-indigo-600'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
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
                      {[
                        { label: 'All', val: 0 },
                        { label: '$10', val: 10 },
                        { label: '$100', val: 100 },
                        { label: '$1K', val: 1000 },
                      ].map((f) => (
                        <button
                          key={f.val}
                          onClick={() => setMinTrade(f.val)}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded transition-colors whitespace-nowrap",
                            minTrade === f.val
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">$</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="Custom"
                          className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 dark:text-slate-300 w-12"
                          onChange={(e) => setMinTrade(Number(e.target.value) || 0)}
                        />
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
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Search Trends</h4>
                        {loadingTrends && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                      </div>
                      {trendsData && trendsData.related_queries?.length > 0 ? (
                        <WordCloud words={trendsData.related_queries} />
                      ) : !loadingTrends && (
                        <div className="h-32 bg-slate-50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-400">
                          No trending search data available
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Related News</h4>
                      <RelatedNews data={newsData} isLoading={loadingNews} />
                    </div>
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
