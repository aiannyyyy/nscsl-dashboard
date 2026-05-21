// src/pages/PDO/components/NSFStatusChart.tsx
import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import { downloadChart } from '../../../utils/chartDownloadUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NSFRecord {
  status?: string | null;
  [key: string]: any;
}

interface NSFStatusChartProps {
  data: NSFRecord[];
  isLoading?: boolean;
  isError?: boolean;
  filterLabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active:   '#36A2EB',   // blue  – matches image 2
  inactive: '#FF6384',   // red
  closed:   '#90C060',   // green
};

const FALLBACK_COLORS = ['#36A2EB', '#FF6384', '#90C060', '#FFCE56', '#9966FF'];

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFStatusChart: React.FC<NSFStatusChartProps> = ({
  data = [],
  isLoading = false,
  isError   = false,
  filterLabel = '',
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Aggregate by status
  const aggregated = React.useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => {
      const key = (r.status ?? 'unknown').toLowerCase();
      map[key]  = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const total = aggregated.reduce((s, d) => s + d.value, 0);

  // Download
  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      const filename = `NSF_Status_Chart`;
      if (format === 'excel') {
        const excelData = aggregated.map((item) => ({
          Status:     item.name.charAt(0).toUpperCase() + item.name.slice(1),
          Count:      item.value,
          Percentage: `${((item.value / total) * 100).toFixed(2)}%`,
        }));
        await downloadChart({
          elementId: 'nsf-status-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: 'NSF Status',
        });
      } else {
        await downloadChart({
          elementId: 'nsf-status-chart',
          filename,
          format,
          backgroundColor: '#ffffff',
          scale: 2,
        });
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Custom label – mirrors Image 2 labels  e.g. "Active, 814, 60%"
  const renderCustomLabel = ({
    cx, cy, midAngle, outerRadius, value, name,
  }: any) => {
    if (!name || value === undefined || total === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 28;
    const x      = cx + radius * Math.cos(-midAngle * RADIAN);
    const y      = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct    = ((value / total) * 100).toFixed(0);
    const label  = `${name.charAt(0).toUpperCase() + name.slice(1)}, ${value}, ${pct}%`;
    const isDark = document.documentElement.classList.contains('dark');

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#e5e7eb' : '#374151'}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        {label}
      </text>
    );
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
      {/* Header */}
      <div className="flex justify-between items-start px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 rounded-t-2xl">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100">
            NSF Status Distribution
          </h4>
          {filterLabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filterLabel}
            </p>
          )}
        </div>

        {/* Export button */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isLoading || aggregated.length === 0}
            className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} /> Export <ChevronDown size={12} />
          </button>
          {showDownloadMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDownloadMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                {(['png', 'svg', 'excel'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleDownload(fmt)}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {fmt === 'excel'
                      ? 'Export Data to Excel'
                      : `Download as ${fmt.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div
        id="nsf-status-chart"
        className="mx-5 mt-4 h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-center"
      >
        {isLoading ? (
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        ) : isError ? (
          <span className="text-sm text-red-500">Failed to load chart data</span>
        ) : aggregated.length === 0 ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            No data available
          </span>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={aggregated}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={0}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {aggregated.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      STATUS_COLORS[entry.name.toLowerCase()] ??
                      FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} facilities`, 'Count']}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, white)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      {aggregated.length > 0 && !isLoading && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 pb-3">
          Total Facilities:{' '}
          <span className="font-semibold text-blue-600">{total}</span>
        </div>
      )}
    </div>
  );
};