// src/pages/PDO/components/NSFReactivateChart.tsx
import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { Download, ChevronDown, ScrollText } from 'lucide-react';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import { useNSFReactivationStatus } from '../../../hooks/PDOHooks/useNSFFacilities';
import { NSFLogsModal } from './NSFLogsModal';

const PROVINCE_COLORS = [
  '#4F86C6', '#F4A261', '#2A9D8F', '#E76F51', '#8B5CF6',
  '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#EC4899',
  '#6366F1', '#84CC16',
];

const MONTHS = [
  { label: 'All',       value: 'All' },
  { label: 'January',   value: '1'   },
  { label: 'February',  value: '2'   },
  { label: 'March',     value: '3'   },
  { label: 'April',     value: '4'   },
  { label: 'May',       value: '5'   },
  { label: 'June',      value: '6'   },
  { label: 'July',      value: '7'   },
  { label: 'August',    value: '8'   },
  { label: 'September', value: '9'   },
  { label: 'October',   value: '10'  },
  { label: 'November',  value: '11'  },
  { label: 'December',  value: '12'  },
];

const selectCls = "h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

export const NSFReactivateChart: React.FC = () => {
  const now = new Date();

  const [month,            setMonth]            = useState(String(now.getMonth() + 1));
  const [year,             setYear]             = useState(String(now.getFullYear()));
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [logsOpen,         setLogsOpen]         = useState(false);

  const yearOptions = Array.from({ length: 8 }, (_, i) =>
    String(now.getFullYear() - 3 + i)
  );

  const filterParams = useMemo(() => ({
    month:      month !== 'All' ? month : undefined,
    year,
  }), [month, year]);

  const { data: resp, isLoading, isError } = useNSFReactivationStatus(filterParams);

  const records = resp?.data ?? [];

  // Group by province
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      const key = r.province?.trim() || 'Unknown';
      map[key]  = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  const periodLabel = month !== 'All'
    ? `${MONTHS.find(m => m.value === month)?.label} ${year}`
    : year;

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      const filename = `NSF_Province_Chart_${periodLabel.replace(/\s+/g, '_')}`;
      if (format === 'excel') {
        const excelData = chartData.map(item => ({
          Province:   item.name,
          Count:      item.value,
          Percentage: total > 0 ? `${((item.value / total) * 100).toFixed(2)}%` : '0%',
        }));
        await downloadChart({ elementId: 'nsf-reactivate-chart', filename, format: 'excel', data: excelData, sheetName: 'NSF Province' });
      } else {
        await downloadChart({ elementId: 'nsf-reactivate-chart', filename, format, backgroundColor: '#ffffff', scale: 2 });
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, value, name }: any) => {
    if (!name || value === undefined || total === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 32;
    const x      = cx + radius * Math.cos(-midAngle * RADIAN);
    const y      = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct    = ((value / total) * 100).toFixed(0);
    const isDark = document.documentElement.classList.contains('dark');
    return (
      <text
        x={x} y={y}
        fill={isDark ? '#e5e7eb' : '#374151'}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={500}
      >
        {`${name}, ${value}, ${pct}%`}
      </text>
    );
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
        {/* Header */}
        <div className="flex justify-between items-start px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 rounded-t-2xl">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">
              NSF Reactivated Per Province
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Distribution by province — {periodLabel}
            </p>
            {resp?.auto_deactivated !== undefined && resp.auto_deactivated > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                ⚠ {resp.auto_deactivated} facility/ies auto-deactivated (PO &gt; 6 months)
              </p>
            )}
            {resp?.auto_reactivated !== undefined && resp.auto_reactivated > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                ✓ {resp.auto_reactivated} facility/ies auto-reactivated (PO within 6 months)
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls}>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => setLogsOpen(true)}
              className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
            >
              <ScrollText size={13} /> View Logs
            </button>
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
        <div id="nsf-reactivate-chart" className="mx-5 mt-4 h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-center">
          {isLoading ? (
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : isError ? (
            <span className="text-sm text-red-500">Failed to load chart data</span>
          ) : chartData.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">No data for {periodLabel}</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PROVINCE_COLORS[index % PROVINCE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} facilities`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, white)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        {chartData.length > 0 && !isLoading && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 pb-3">
            Total Records: <span className="font-semibold text-blue-600">{total}</span>
          </div>
        )}
      </div>

      <NSFLogsModal
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title="Reactivation & Deactivation Logs"
        subtitle="Auto and manual status changes based on PO date"
        month={month}
        year={year}
      />
    </>
  );
};