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
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || !data.articles.length) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 italic">
        No related news found for this market.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.articles.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-slate-50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 rounded-xl p-3 transition-all"
        >
          <div className="flex gap-3">
            {article.image && (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                <Image
                  src={article.image}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                    {article.site || 'News'}
                  </span>
                  {article.published && (
                    <span className="text-[9px] text-slate-400 font-medium">
                      • {new Date(article.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-1">
                {article.title}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {article.description}
              </p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
