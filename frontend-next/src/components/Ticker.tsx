'use client';

import React from 'react';
import { MarketHeadline } from '@/lib/api';

interface TickerProps {
  markets: MarketHeadline[];
}

export default function Ticker({ markets }: TickerProps) {
  const slice = markets.slice(0, 14);

  if (!slice.length) {
    return (
      <div className="h-9 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 text-[11px] text-slate-400 animate-pulse z-[90] shrink-0">
        Loading market trends...
      </div>
    );
  }

  // Double items for seamless infinite scroll
  const items = [...slice, ...slice];

  return (
    <div className="h-9 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-[90] overflow-hidden flex items-center shrink-0 group">
      <div className="ticker-track gap-8 px-8">
        {items.map((m, i) => {
          const topOutcome = m.outcomes && m.outcomes.length > 2
            ? m.outcomes.reduce((prev, cur) => prev.probability > cur.probability ? prev : cur).title
            : 'Yes';

          return (
            <a
              key={`${m.condition_id}-${i}`}
              href={m.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 shrink-0 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            >
              {m.image && (
                <img
                  src={m.image}
                  alt=""
                  className="w-5 h-5 rounded object-cover"
                />
              )}
              <span className="text-[11px] font-medium max-w-[200px] truncate">
                {m.title}
              </span>
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                {topOutcome} {m.probability || 0}%
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
