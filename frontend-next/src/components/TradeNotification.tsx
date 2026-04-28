'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecentTrade } from '@/lib/api';
import { TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeNotificationProps {
  trade: RecentTrade | null;
  onClick: (trade: RecentTrade) => void;
}

export default function TradeNotification({ trade, onClick }: TradeNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trade) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [trade]);

  return (
    <AnimatePresence>
      {visible && trade && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, x: 50 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onClick(trade)}
          className="fixed top-20 right-6 z-[3000] w-[320px] cursor-pointer"
        >
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden relative group">
            {/* Animated accent bar */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500",
              trade.type === 'buy' ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            )} />

            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg flex items-center justify-center",
                    trade.type === 'buy' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                  )}>
                    {trade.type === 'buy' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    trade.type === 'buy' ? "text-green-600" : "text-red-500"
                  )}>
                    {trade.type.toUpperCase()} ALERT
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Live Activity</span>
                </div>
              </div>

              <h4 className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3">
                {trade.title}
              </h4>

              <div className="flex items-end justify-between">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Trade Price</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                    {trade.price.toFixed(1)}<span className="text-xs font-bold text-slate-400 ml-0.5">¢</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />

                <div className="space-y-0.5 text-right">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Current Market</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                    {trade.current_price.toFixed(1)}<span className="text-xs font-bold text-slate-400 ml-0.5">¢</span>
                  </div>
                </div>
              </div>

              {/* Progress bar of time remaining for notification */}
              <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                  className={cn(
                    "h-full rounded-full",
                    trade.type === 'buy' ? "bg-green-500" : "bg-red-500"
                  )}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
