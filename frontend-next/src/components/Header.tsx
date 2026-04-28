'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search, Moon, Sun, X, Filter, ChevronDown, PanelRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { MarketHeadline } from '@/lib/api';

interface HeaderProps {
  markets: MarketHeadline[];
  onSearch: (query: string) => void;
  onMarketSelect: (market: MarketHeadline) => void;
  onCategoryChange: (category: string | null) => void;
  isFeedOpen: boolean;
  onFeedToggle: () => void;
}

const CATEGORIES = [
  { id: null, label: 'All Categories' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'politics', label: 'Politics' },
  { id: 'finance', label: 'Finance' },
  { id: 'sports', label: 'Sports' },
  { id: 'tech', label: 'Tech' },
  { id: 'climate', label: 'Climate' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'social', label: 'X / Social' },
];

function fmtCountdown(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? days + 'd ' + hrs + 'h' : hrs + 'h';
}

export default function Header({ markets, onSearch, onMarketSelect, onCategoryChange, isFeedOpen, onFeedToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? markets.filter(m => m.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleInput = (val: string) => {
    setQuery(val);
    onSearch(val);
    setShowResults(val.trim().length > 0);
  };

  const handleSelect = (market: MarketHeadline) => {
    onMarketSelect(market);
    setQuery('');
    setShowResults(false);
    onSearch('');
  };
  const handleCategorySelect = (id: string | null) => {
    setActiveCategory(id);
    onCategoryChange(id);
    setShowFilters(false);
  };

  return (
    <>
      {/* Overlay */}
      {showResults && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[2000]"
          onClick={() => { setShowResults(false); setQuery(''); onSearch(''); }}
        />
      )}

      <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-[2001] shrink-0 relative">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-extrabold text-lg shadow-lg animate-logo">
            U
          </div>
          <div className="hidden sm:block">
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              UnivInsight
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Universal Insight
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex-1 flex justify-center items-center gap-3 z-[2001]">
          <div className="relative w-full max-w-[420px]" ref={containerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              placeholder="Find Market"
              className="w-full h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => { if (query.trim()) setShowResults(true); }}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setShowResults(false); onSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Results Dropdown */}
            {showResults && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-[2002]">
                {filtered.length > 0 ? (
                  filtered.map((m, i) => {
                    const topOutcome = m.outcomes && m.outcomes.length > 2
                      ? m.outcomes.reduce((prev, cur) => prev.probability > cur.probability ? prev : cur).title
                      : 'Yes';
                    return (
                      <div
                        key={`${m.condition_id}-${i}`}
                        className="px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                        onClick={() => handleSelect(m)}
                      >
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-1.5">
                          {m.title}
                        </div>
                        <div className="flex gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                            {topOutcome} {m.probability || 0}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            No {Math.round((100 - (m.probability || 0)) * 10) / 10}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20 ml-auto">
                            {fmtCountdown(m.end_date)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-sm text-slate-400">No markets found</div>
                )}
              </div>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800 border rounded-xl transition-all shadow-sm",
                activeCategory 
                  ? "border-indigo-500 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30" 
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <Filter className="w-4 h-4" />
            </button>

            {showFilters && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 z-[2002]">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id || 'all'}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between",
                      activeCategory === cat.id 
                        ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {cat.label}
                    {activeCategory === cat.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feed Toggle */}
          <button
            onClick={onFeedToggle}
            className={cn(
              "h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800 border rounded-xl transition-all shadow-sm",
              isFeedOpen 
                ? "border-indigo-500 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30" 
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
            )}
            title="Toggle Live Feed"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-400 transition-colors text-slate-600 dark:text-slate-400"
          >
            {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
          </button>
        </div>
      </header>
    </>
  );
}
