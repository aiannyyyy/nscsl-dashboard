// src/pages/PDO/components/NSFStatusChart.tsx
import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { Download, ChevronDown, ScrollText } from 'lucide-react';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import { useNSFStatusDistribution } from '../../../hooks/PDOHooks/useNSFFacilities';
import { NSFLogsModal } from './NSFLogsModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['active', 'inactive', 'closed', 'partner'];

const STATUS_COLORS: Record<string, string> = {
  active:   '#36A2EB',
  inactive: '#FF6384',
  closed:   '#90C060',
  partner:  '#FFCE56',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFStatusChart: React.FC = () => {
  const { data = [], isLoading, isError } = useNSFStatusDistribution();
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [logsOpen,         setLogsOpen]         = useState(false);

  // Filter to only allowed statuses
  const chartData = data
    .filter(d => ALLOWED_STATUSES.includes(d.status.toLowerCase()))
    .map(d => ({ name: d.status, value: d.count }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      const filename = 'NSF_Status_Chart';
      if (format === 'excel') {
        const excelData = chartData.map(item => ({
          Status:     item.name.charAt(0).toUpperCase() + item.name.slice(1),
          Count:      item.value,
          Percentage: `${((item.value / total) * 100).toFixed(2)}%`,
        }));
        await downloadChart({ elementId: 'nsf-status-chart', filename, format: 'excel', data: excelData, sheetName: 'NSF Status' });
      } else {
        await downloadChart({ elementId: 'nsf-status-chart', filename, format, backgroundColor: '#ffffff', scale: 2 });
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, value, name }: any) => {
    if (!name || value === undefined || total === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 28;
    const x      = cx + radius * Math.cos(-midAngle * RADIAN);
    const y      = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct    = ((value / total) * 100).toFixed(0);
    const label  = `${name.charAt(0).toUpperCase() + name.slice(1)}, ${value}, ${pct}%`;
    const isDark = document.documentElement.classList.contains('dark');
    return (
      <text x={x} y={y} fill={isDark ? '#e5e7eb' : '#374151'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>
        {label}
      </text>
    );
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
        {/* Header */}
        <div className="flex justify-between items-start px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 rounded-t-2xl">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">NSF Status Distribution</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active · Inactive · Closed · Partner</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Logs button */}
            <button
              onClick={() => setLogsOpen(true)}
              className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
            >
              <ScrollText size={13} />
              View Logs
            </button>

            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isLoading || chartData.length === 0}
                className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Export <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    {(['png', 'svg', 'excel'] as const).map(fmt => (
                      <button key={fmt} onClick={() => handleDownload(fmt)} className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                        {fmt === 'excel' ? 'Export Data to Excel' : `Download as ${fmt.toUpperCase()}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div id="nsf-status-chart" className="mx-5 mt-4 h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-center">
          {isLoading ? (
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : isError ? (
            <span className="text-sm text-red-500">Failed to load chart data</span>
          ) : chartData.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">No data available</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={0}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} facilities`, 'Count']}
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, white)', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Legend formatter={value => value.charAt(0).toUpperCase() + value.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        {chartData.length > 0 && !isLoading && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 pb-3">
            Total Facilities: <span className="font-semibold text-blue-600">{total}</span>
          </div>
        )}
      </div>

      {/* Logs Modal — shows all status change logs (reactivated + deactivated) */}
      <NSFLogsModal
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title="Facility Status Change Logs"
        subtitle="All reactivation and deactivation history across facilities"
      />
    </>
  );
};