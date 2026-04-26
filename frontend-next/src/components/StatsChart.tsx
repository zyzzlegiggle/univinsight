'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PriceHistory, fetchPriceHistory } from '@/lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface StatsChartProps {
  tokenId?: string;
}

const INTERVALS = ['1h', '6h', '1d', '1w', '1m', 'max'] as const;

export default function StatsChart({ tokenId }: StatsChartProps) {
  const [activeInterval, setActiveInterval] = useState<string>('1d');
  const [data, setData] = useState<PriceHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    setIsLoading(true);
    fetchPriceHistory(tokenId, activeInterval)
      .then(d => setData(d))
      .catch(e => console.error(e))
      .finally(() => setIsLoading(false));
  }, [tokenId, activeInterval]);

  if (!tokenId) {
    return (
      <div className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-xs text-slate-400">
        No price data available
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex gap-1 mb-3">
          {INTERVALS.map((iv) => (
            <button key={iv} className="flex-1 py-1.5 text-[10px] font-bold uppercase text-slate-300 border-b-2 border-transparent">
              {iv}
            </button>
          ))}
        </div>
        <div className="w-full h-44 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const history = data?.history || [];

  const chartData = {
    labels: history.map(h => {
      if (!h.t) return '';
      return new Date(h.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        fill: true,
        label: 'Probability',
        data: history.map(h => Number(h.p) * 100),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#4f46e5',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: {
      padding: {
        top: 10,
        right: 40,
        bottom: 20,
        left: 0
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#1e293b',
        titleColor: '#94a3b8',
        titleFont: { size: 10, weight: 'bold' },
        bodyColor: '#fff',
        bodyFont: { size: 12, weight: 'bold' },
        padding: 10,
        displayColors: false,
        cornerRadius: 8,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const h = history[items[0].dataIndex];
            return h.t ? new Date(h.t * 1000).toLocaleString() : '';
          },
          label: (ctx) => `${ctx.parsed.y.toFixed(1)}%`
        }
      },
    },
    hover: {
      mode: 'index',
      intersect: false
    },
    scales: {
      x: { display: false },
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          font: { size: 10, weight: 'bold' },
          color: '#94a3b8',
          callback: (value) => `${value}c`
        },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        border: { display: false },
      },
    },
  };

  // Custom crosshair plugin
  const plugins = [{
    id: 'crosshair',
    afterDraw: (chart: any) => {
      if (chart.tooltip?._active?.length) {
        const x = chart.tooltip._active[0].element.x;
        const y = chart.tooltip._active[0].element.y;
        const ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x, chart.chartArea.top);
        ctx.lineTo(x, chart.chartArea.bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, y);
        ctx.lineTo(chart.chartArea.right, y);
        ctx.stroke();
        // Axis labels boxes
        const dataIndex = chart.tooltip._active[0].dataIndex;
        const pt = history[dataIndex];
        if (!pt) return;

        const pText = `${(Number(pt.p) * 100).toFixed(1)}c`;
        const tText = pt.t ? new Date(Number(pt.t) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Time label (at bottom of vertical line)
        const tW = ctx.measureText(tText).width + 8;
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x - tW / 2, chart.chartArea.bottom, tW, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(tText, x, chart.chartArea.bottom + 8);

        // Price label (at right of horizontal line)
        const pW = ctx.measureText(pText).width + 8;
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(chart.chartArea.right, y - 8, pW, 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(pText, chart.chartArea.right + 4, y);

        ctx.restore();
      }
    }
  }];

  return (
    <div>
      <div className="flex gap-0 mb-3">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setActiveInterval(iv)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-colors border-b-2 ${
              activeInterval === iv
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>
      <div className="w-full h-44 relative">
        {history.length > 0 ? (
          <Line data={chartData} options={options} plugins={plugins} />
        ) : (
          <div className="w-full h-full bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-xs text-slate-400">
            No price data available
          </div>
        )}
      </div>
    </div>
  );
}
