'use client';

import React, { useEffect, useRef } from 'react';

interface WordCloudProps {
  words: string[];
  width?: number;
  height?: number;
}

export default function WordCloud({ words, width = 300, height = 200 }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !words.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Filter and shuffle words
    const items = words.map((w, i) => ({
      text: w,
      size: Math.max(10, 24 - i * 1.5), // Gradually smaller
      color: `hsl(${210 + Math.random() * 40}, 70%, ${40 + Math.random() * 20}%)`,
    }));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const placed: { x: number; y: number; w: number; h: number }[] = [];

    items.forEach((item) => {
      ctx.font = `bold ${item.size}px Inter, sans-serif`;
      const metrics = ctx.measureText(item.text);
      const w = metrics.width + 6;
      const h = item.size + 6;

      let x, y, collides;
      let attempts = 0;

      do {
        collides = false;
        x = Math.random() * (width - w) + w / 2;
        y = Math.random() * (height - h) + h / 2;

        for (const p of placed) {
          if (
            x - w / 2 < p.x + p.w / 2 &&
            x + w / 2 > p.x - p.w / 2 &&
            y - h / 2 < p.y + p.h / 2 &&
            y + h / 2 > p.y - p.h / 2
          ) {
            collides = true;
            break;
          }
        }
        attempts++;
      } while (collides && attempts < 100);

      if (!collides) {
        placed.push({ x, y, w, h });
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, x, y);
      }
    });
  }, [words, width, height]);

  return (
    <div className="bg-white rounded-xl p-4 flex items-center justify-center border border-slate-200 shadow-sm">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="max-w-full h-auto"
      />
    </div>
  );
}
