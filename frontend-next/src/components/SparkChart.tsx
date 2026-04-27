'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface SparkChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  prefix?: string;
}

export default function SparkChart({ 
  data, 
  labels, 
  color = '#4f46e5', 
  height = 40,
  prefix = ''
}: SparkChartProps) {
  const chartData = {
    labels: labels || data.map((_, i) => i.toString()),
    datasets: [
      {
        fill: true,
        data: data,
        borderColor: color,
        backgroundColor: `${color}15`,
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 1.5,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleColor: '#94a3b8',
        titleFont: { size: 8 },
        bodyColor: '#fff',
        bodyFont: { size: 10, weight: 'bold' },
        padding: 6,
        displayColors: false,
        cornerRadius: 4,
        callbacks: {
          title: () => null,
          label: (ctx: any) => `${prefix}${ctx.parsed.y.toLocaleString()}`
        }
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    hover: {
      mode: 'index',
      intersect: false
    }
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
