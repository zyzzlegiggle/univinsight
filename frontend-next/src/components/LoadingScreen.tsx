'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  isVisible: boolean;
  text?: string;
}

export default function LoadingScreen({ isVisible, text = 'Initializing Map...' }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 bg-white dark:bg-slate-950 z-[9999] flex flex-col items-center justify-center"
        >
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-pulse"
          >
            {text}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
