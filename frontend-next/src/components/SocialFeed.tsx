'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TweetData } from '@/lib/api';
import { X, ExternalLink, Calendar, MessageSquare } from 'lucide-react';

interface SocialFeedProps {
  tweets: TweetData[];
  onTweetClick: (tweet: TweetData) => void;
  onClose: () => void;
}

export default function SocialFeed({ tweets, onTweetClick, onClose }: SocialFeedProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = React.useState(true);
  const [newCount, setNewCount] = React.useState(0);
  const [lastTopId, setLastTopId] = React.useState<string | null>(tweets[0]?.id || null);

  // Handle scroll detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const atTop = top < 50;
    setIsAtTop(atTop);
    
    if (atTop) {
      setNewCount(0);
      setLastTopId(tweets[0]?.id || null);
    }
  };

  // Detect new tweets while scrolled down
  React.useEffect(() => {
    if (tweets.length === 0) return;

    if (isAtTop) {
      setLastTopId(tweets[0].id);
      setNewCount(0);
    } else if (lastTopId) {
      // Find how many tweets are newer than the last one we saw at the top
      const idx = tweets.findIndex(t => t.id === lastTopId);
      if (idx !== -1) {
        setNewCount(idx);
      } else {
        // If lastTopId is no longer in the list (highly unlikely with history), just show many
        setNewCount(tweets.length);
      }
    }
  }, [tweets, isAtTop, lastTopId]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setNewCount(0);
    setLastTopId(tweets[0]?.id || null);
    setIsAtTop(true);
  };

  return (
    <motion.div 
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed top-32 right-6 bottom-6 w-[380px] z-[2000] flex flex-col"
    >
      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col h-full relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Live Feed</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Tweets Notification */}
        <AnimatePresence>
          {newCount > 0 && !isAtTop && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-[80px] left-0 right-0 z-20 flex justify-center pointer-events-none"
            >
              <button 
                onClick={scrollToTop}
                className="pointer-events-auto bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {newCount} New {newCount === 1 ? 'Tweet' : 'Tweets'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Feed */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
        >
          {tweets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">No activity today</p>
            </div>
          ) : (
            tweets.map((tweet, idx) => (
              <motion.div
                key={tweet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onTweetClick(tweet)}
                className="group relative bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 rounded-2xl p-4 transition-all cursor-pointer"
              >
                {/* Brand Badge */}
                <div className="absolute top-4 right-4 w-4 h-4 bg-black rounded-md flex items-center justify-center p-1 border border-white/10 shadow-sm z-10 transition-transform group-hover:scale-110">
                   <img src="/x-logo.png" className="w-full h-full" />
                </div>

                <div className="flex items-start gap-3">
                  <img 
                    src="https://unavatar.io/twitter/polymarket" 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="mb-2">
                      <div className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">Polymarket</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {new Date(tweet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                      {tweet.text}
                    </p>
                    
                    <div className="mt-3 flex gap-2">
                       {tweet.locations.slice(0, 2).map(loc => (
                         <span key={loc} className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{loc}</span>
                       ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
