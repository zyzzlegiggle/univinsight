'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TweetData } from '@/lib/api';
import { X, ExternalLink, Calendar, MessageSquare } from 'lucide-react';

interface SocialFeedProps {
  tweets: TweetData[];
  onTweetClick: (tweet: TweetData) => void;
  onClose: () => void;
}

export default function SocialFeed({ tweets, onTweetClick, onClose }: SocialFeedProps) {
  return (
    <motion.div 
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed top-32 right-6 bottom-6 w-[380px] z-[2000] flex flex-col"
    >
      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Live Feed</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
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
                    src="https://pbs.twimg.com/profile_images/1220442345065750528/l6p28vL8_400x400.jpg" 
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
