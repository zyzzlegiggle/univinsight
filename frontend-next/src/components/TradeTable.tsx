'use client';

import React from 'react';
import { Trade } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TradeTableProps {
  trades: Trade[];
  isLoading: boolean;
  minTrade: number;
}

function fmtTime(d: string) {
  if (!d) return '--';
  try {
    const dt = new Date(d);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[dt.getDay()];
    let hrs = dt.getHours();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    const mins = dt.getMinutes().toString().padStart(2, '0');
    return `${day} ${hrs}:${mins} ${ampm}`;
  } catch { return '--'; }
}

export default function TradeTable({ trades, isLoading, minTrade }: TradeTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        ))}
      </div>
    );
  }

  const filtered = trades.filter(t => t.value >= minTrade);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-10 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
        No trades match filter
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <th className="py-2 px-1 font-bold text-slate-400 uppercase tracking-tighter">Time</th>
            <th className="py-2 px-1 font-bold text-slate-400 uppercase tracking-tighter">Pos</th>
            <th className="py-2 px-1 font-bold text-slate-400 uppercase tracking-tighter">Value</th>
            <th className="py-2 px-1 font-bold text-slate-400 uppercase tracking-tighter">Price</th>
            <th className="py-2 px-1 font-bold text-slate-400 uppercase tracking-tighter">Side</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {filtered.map((trade, i) => {
            const isBuy = (trade.side || '').includes('BUY');
            const pos = (trade.position || '').toLowerCase().includes('yes') ? 'Yes' : 'No';
            return (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-1 text-slate-500 font-medium whitespace-nowrap">{fmtTime(trade.time)}</td>
                <td className={cn(
                  "py-2 px-1 font-bold",
                  pos === 'Yes' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {pos}
                </td>
                <td className="py-2 px-1 text-slate-900 dark:text-slate-100 font-bold">
                  ${trade.value.toLocaleString()}
                </td>
                <td className="py-2 px-1 text-slate-600 dark:text-slate-400 font-semibold">
                  {(trade.price * 100).toFixed(1)}c
                </td>
                <td className={cn(
                  "py-2 px-1 font-bold",
                  isBuy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isBuy ? 'Buy' : 'Sell'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
