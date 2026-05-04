'use client';

import React from 'react';
import { RelatedInfo } from '@/lib/api';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface RelatedNewsProps {
  data: RelatedInfo | null;
  isLoading: boolean;
}

export default function RelatedNews({ data, isLoading }: RelatedNewsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden pb-4 -mx-6 px-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-[280px] h-[140px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (!data || !data.articles.length) {
    return (
      <div className="py-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest italic bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        No related news found for this market.
      </div>
    );
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  return (
    <div className="relative group">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide no-scrollbar -mx-6 px-6">
        {data.articles.map((article, i) => {
          const domain = getDomain(article.url);
          return (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/card block w-[280px] shrink-0 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-1 snap-start"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Source Logo with Fallback to Tag */}
                    <div className="flex items-center gap-1.5">
                      {domain && (
                        <div className="w-4 h-4 rounded shadow-sm overflow-hidden flex-shrink-0 bg-white dark:bg-slate-700">
                          <img 
                            src={`https://unavatar.io/${domain}`}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              // Show the tag instead
                              const tag = (e.target as HTMLImageElement).parentElement?.nextElementSibling;
                              if (tag) (tag as HTMLElement).style.display = 'block';
                            }}
                          />
                        </div>
                      )}
                      <div className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 rounded text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest" 
                           style={{ display: domain ? 'none' : 'block' }}>
                        {article.site?.split('.')[0] || 'News'}
                      </div>
                    </div>

                    {article.published && !isNaN(new Date(article.published).getTime()) && (
                      <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">
                        {new Date(article.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover/card:text-indigo-500 transition-colors" />
                </div>

              <div className="flex gap-3 mb-3">
                {article.image && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={article.image}
                      alt=""
                      fill
                      className="object-cover group-hover/card:scale-110 transition-transform duration-700"
                    />
                  </div>
                )}
                <h4 className="text-[12px] font-bold text-slate-900 dark:text-slate-100 leading-tight line-clamp-3">
                  {article.title}
                </h4>
              </div>

              {article.description && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-auto">
                  {article.description}
                </p>
              )}
              </div>
            </a>
          );
        })}
      </div>
      
      {/* Visual fade indicators for scrolling */}
      <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 left-0 bottom-4 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
