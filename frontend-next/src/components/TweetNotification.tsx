'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TweetData } from '@/lib/api';
import { MessageSquare, ExternalLink, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TweetNotificationProps {
  tweet: TweetData | null;
  onClick: (tweet: TweetData) => void;
}

export default function TweetNotification({ tweet, onClick }: TweetNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (tweet) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 12000);
      return () => clearTimeout(timer);
    }
  }, [tweet]);

  if (!tweet) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, x: 50 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => onClick(tweet)}
          className="fixed bottom-24 right-6 z-[3000] w-[340px] cursor-pointer"
        >
          <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] overflow-hidden relative group">
            {/* X Logo in Top Right */}
            <div className="absolute top-4 right-4 w-5 h-5 bg-black rounded-md flex items-center justify-center p-1 z-20">
              <img src="/x-logo.png" alt="X" className="w-full h-full" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                  <img 
                    src="https://pbs.twimg.com/profile_images/1220442345065750528/l6p28vL8_400x400.jpg" 
                    alt="Polymarket" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-[14px] font-black text-slate-900 dark:text-white leading-none">Polymarket</div>
                </div>
              </div>

              <div className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed font-semibold mb-2">
                {tweet.text}
              </div>
            </div>

            {/* Bottom Timer */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-900 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 12, ease: 'linear' }}
                className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
