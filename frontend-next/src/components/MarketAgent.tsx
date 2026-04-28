'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { fetchAgentChat, MarketHeadline } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface MarketAgentProps {
  market: MarketHeadline;
  context: any;
}

export default function MarketAgent({ market, context }: MarketAgentProps) {
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    try {
      const fullContext = {
        market_title: market.title,
        probability: market.probability,
        volume: market.volume,
        end_date: market.end_date,
        categories: market.categories,
        intelligence: context,
      };

      const res = await fetchAgentChat(question, fullContext);
      setHistory(prev => [...prev, { question, answer: res.response }]);
    } catch {
      setHistory(prev => [...prev, { question, answer: 'Failed to reach the agent. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
      {/* Scrollable content area */}
      <div
        ref={scrollRef}
        className="max-h-[500px] overflow-y-auto custom-scrollbar"
      >
        {/* Empty state */}
        {history.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-[280px]">
              Ask anything about this market. The agent has access to all the intelligence gathered above.
            </p>
          </div>
        )}

        {/* Q&A Entries */}
        {history.map((entry, i) => (
          <div key={i} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
            {/* Question */}
            <div className="px-5 pt-4 pb-2">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">You</span>
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mt-1">{entry.question}</p>
            </div>
            {/* Answer — rendered markdown */}
            <div className="px-5 pb-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agent</span>
              <div className="mt-1 prose prose-sm prose-slate dark:prose-invert max-w-none text-[12px] leading-relaxed
                prose-headings:text-[13px] prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1
                prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5
                prose-strong:text-slate-900 dark:prose-strong:text-white
                prose-code:text-[11px] prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown>{entry.answer}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Loading state */}
        {loading && (
          <div className="px-5 py-6 flex items-center gap-3 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[11px] font-medium">Analyzing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this market..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
