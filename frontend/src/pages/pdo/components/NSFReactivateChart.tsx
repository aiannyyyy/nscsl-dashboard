// src/pages/PDO/components/NSFReactivateChart.tsx
import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { Download, ChevronDown, ScrollText } from 'lucide-react';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import { useNSFReactivatedByProvince } from '../../../hooks/PDOHooks/useNSFFacilities';
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

const ACTION_OPTIONS = [
  { label: 'Reactivated', value: 'reactivated' },
  { label: 'Deactivated', value: 'deactivated' },
] as const;

type ActionFilter = 'reactivated' | 'deactivated';

const ACTION_THEME: Record<ActionFilter, {
  dot:   string;
  total: string;
  empty: string;
}> = {
  reactivated: {
    dot:   'bg-green-500',
    total: 'text-green-600 dark:text-green-400',
    empty: 'No reactivated facilities',
  },
  deactivated: {
    dot:   'bg-amber-500',
    total: 'text-amber-600 dark:text-amber-400',
    empty: 'No deactivated facilities',
  },
};

const selectCls = "h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

export const NSFReactivateChart: React.FC = () => {
  const now = new Date();

  const [month,            setMonth]            = useState(String(now.getMonth() + 1));
  const [year,             setYear]             = useState(String(now.getFullYear()));
  const [actionFilter,     setActionFilter]     = useState<ActionFilter>('reactivated');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [logsOpen,         setLogsOpen]         = useState(false);

  const yearOptions = Array.from({ length: 8 }, (_, i) =>
    String(now.getFullYear() - 3 + i)
  );

  const filterParams = useMemo(() => ({
    month:  month !== 'All' ? month : undefined,
    year,
    action: actionFilter,
  }), [month, year, actionFilter]);

  const { data: resp, isLoading, isError } = useNSFReactivatedByProvince(filterParams);

  const chartData = useMemo(() =>
    (resp?.data ?? []).map(r => ({
      name:  r.province,
      value: Number(r.count),
    })),
  [resp]);

  const total       = resp?.total ?? 0;
  const theme       = ACTION_THEME[actionFilter];
  const actionLabel = ACTION_OPTIONS.find(o => o.value === actionFilter)?.label ?? '';

  const periodLabel = month !== 'All'
    ? `${MONTHS.find(m => m.value === month)?.label} ${year}`
    : year;

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      const filename = `NSF_${actionLabel}_By_Province_${periodLabel.replace(/\s+/g, '_')}`;
      if (format === 'excel') {
        const excelData = chartData.map(item => ({
          Province:      item.name,
          [actionLabel]: item.value,
          Percentage:    total > 0 ? `${((item.value / total) * 100).toFixed(2)}%` : '0%',
        }));
        await downloadChart({
          elementId: 'nsf-reactivate-chart',
          filename,
          format:    'excel',
          data:      excelData,
          sheetName: `NSF ${actionLabel}`,
        });
      } else {
        await downloadChart({
          elementId:       'nsf-reactivate-chart',
          filename,
          format,
          backgroundColor: '#ffffff',
          scale:           2,
        });
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // ── Custom label: only show for slices >= 5% to avoid crowding ───────────────
  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, value, name,
  }: any) => {
    if (!name || value === undefined || total === 0) return null;
    const pct = (value / total) * 100;
    if (pct < 5) return null; // skip tiny slices

    const RADIAN     = Math.PI / 180;
    // Place label at midpoint between inner edge and well outside outer edge
    const labelRadius = outerRadius + 45;
    const x           = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const y           = cy + labelRadius * Math.sin(-midAngle * RADIAN);
    const isDark      = document.documentElement.classList.contains('dark');

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#e5e7eb' : '#374151'}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={500}
      >
        {`${name}, ${value}, ${pct.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 rounded-t-2xl gap-3">

          {/* Left: title + subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap">
                NSF {actionLabel} Per Province
              </h4>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dot}`} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
              {actionLabel} facilities by province — {periodLabel}
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">

            {/* Action filter */}
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value as ActionFilter)}
              className={selectCls}
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Month */}
            <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls}>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year */}
            <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* View Logs */}
            <button
              onClick={() => setLogsOpen(true)}
              className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <ScrollText size={13} /> View Logs
            </button>

            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(v => !v)}
                disabled={isLoading || chartData.length === 0}
                className="h-8 px-3 text-xs rounded-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Download size={14} /> Export <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    {(['png', 'svg', 'excel'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => handleDownload(fmt)}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        {fmt === 'excel' ? 'Export Data to Excel' : `Download as ${fmt.toUpperCase()}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Chart area ─────────────────────────────────────────────────────── */}
        <div
          id="nsf-reactivate-chart"
          className="flex-1 mx-5 mt-4 mb-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden"
        >
          {isLoading ? (
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : isError ? (
            <span className="text-sm text-red-500">Failed to load chart data</span>
          ) : chartData.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {theme.empty} for {periodLabel}
            </span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 30, right: 80, bottom: 30, left: 80 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
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
                    `${value} ${actionLabel.toLowerCase()}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, white)',
                    border:          '1px solid #e5e7eb',
                    borderRadius:    '0.5rem',
                    fontSize:        '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        {chartData.length > 0 && !isLoading && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 pb-3">
            Total {actionLabel}:{' '}
            <span className={`font-semibold ${theme.total}`}>{total}</span>
          </div>
        )}
      </div>

      {/* Logs Modal — pre-filtered to the active action */}
      <NSFLogsModal
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title={`${actionLabel} Facilities Logs`}
        subtitle={`${actionLabel} facilities by province`}
        action={actionFilter}
        month={month}
        year={year}
      />
    </>
  );
};