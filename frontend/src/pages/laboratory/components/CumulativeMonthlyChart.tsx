// src/components/Laboratory/CumulativeMonthlyChart.tsx
import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useReceivedCensus } from '../../../hooks/LaboratoryHooks/useCensus';
import { HISTORICAL_CENSUS_DATA } from '../../../constants/cumulativeCensusData';
import type { CumulativeCensusDataItem } from '../../../services/LaboratoryServices/censusService';
import { downloadChart } from '../../../utils/chartDownloadUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CumulativeData {
  month: string;
  monthIndex: number;
  [year: string]: number | string;
}

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPORT_FORMATS = ['png', 'svg', 'excel'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
  '#e11d48',
];

// ---------------------------------------------------------------------------
// Helper: merge hardcoded history + live API data
// API data takes priority for any year it returns (2026+ auto-updates).
// ---------------------------------------------------------------------------

function mergeData(apiRows: CumulativeCensusDataItem[]): CumulativeCensusDataItem[] {
  const liveYears = new Set(apiRows.map(r => r.YEAR.toString()));

  // Keep historical rows only for years NOT returned by the API
  const historicalFiltered = HISTORICAL_CENSUS_DATA.filter(
    r => !liveYears.has(r.YEAR.toString())
  );

  return [...historicalFiltered, ...apiRows];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CumulativeMonthlyChart: React.FC<Props> = ({ expanded, onExpand }) => {
  const [showTable, setShowTable]         = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { data: apiData, isLoading, error, refetch } = useReceivedCensus();

  // ------------------------------------------------------------------
  // Transform: merge history + live, then shape for Recharts
  // ------------------------------------------------------------------
  const { chartData, years } = useMemo(() => {
    const apiRows = apiData?.data ?? [];
    const merged  = mergeData(apiRows);

    if (merged.length === 0) return { chartData: [], years: [] };

    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Unique sorted years
    const uniqueYears = Array.from(
      new Set(merged.filter(r => r.YEAR != null).map(r => r.YEAR.toString()))
    ).sort();

    // Track the real data bounds per year to avoid flatline spans
    const yearBounds: Record<string, { first: number; last: number }> = {};
    merged.forEach(item => {
      if (item.YEAR == null || item.MONTH == null) return;
      const y = item.YEAR.toString();
      yearBounds[y] = yearBounds[y]
        ? {
            first: Math.min(yearBounds[y].first, item.MONTH),
            last:  Math.max(yearBounds[y].last,  item.MONTH),
          }
        : { first: item.MONTH, last: item.MONTH };
    });

    // Base rows — one per month
    const rows: CumulativeData[] = MONTH_LABELS.map((label, idx) => ({
      month: label,
      monthIndex: idx + 1,
    }));

    // Fill in sample counts
    merged.forEach(item => {
      if (item.YEAR == null || item.MONTH == null) return;
      // Skip future months for the current year
      if (item.YEAR === currentYear && item.MONTH > currentMonth) return;

      const idx  = item.MONTH - 1;
      const year = item.YEAR.toString();
      if (rows[idx]) {
        rows[idx][year] = item.TOTAL_SAMPLES ?? 0;
      }
    });

    // Fill mid-year gaps with 0; leave leading/trailing as undefined so lines stop cleanly
    rows.forEach((row, idx) => {
      const monthNumber = idx + 1;
      uniqueYears.forEach(year => {
        if (row[year] === undefined) {
          const bounds = yearBounds[year];
          if (bounds && monthNumber >= bounds.first && monthNumber <= bounds.last) {
            row[year] = 0;
          }
        }
      });
    });

    return { chartData: rows, years: uniqueYears };
  }, [apiData]);

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const exportData = useMemo(
    () =>
      chartData.map(row => {
        const out: Record<string, unknown> = { Month: row.month };
        years.forEach(y => { out[y] = row[y]; });
        return out;
      }),
    [chartData, years]
  );

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false);
    const filename = `cumulative-monthly-received-${new Date().toISOString().split('T')[0]}`;
    try {
      await downloadChart({
        elementId: 'cumulative-chart-container',
        filename,
        format,
        data: format === 'excel' ? exportData : undefined,
        sheetName: 'Received Data',
        backgroundColor: document.documentElement.classList.contains('dark')
          ? '#111827'
          : '#ffffff',
        scale: 2,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const hasData = !isLoading && !error && chartData.length > 0;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div
      className={`flex flex-col rounded-2xl shadow-lg overflow-hidden
        bg-white dark:bg-gray-900
        transition-all duration-300 ease-in-out
        ${expanded ? 'h-[650px]' : 'h-[380px]'}`}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b
          bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        {/* Title */}
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0l-8 8m8-8v12M5 21H3a2 2 0 01-2-2V5a2 2 0 012-2h2m4 18h8"
            />
          </svg>
          Cumulative Monthly Census
          <span className="text-xs font-normal text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            Received
          </span>
        </h3>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart / Table toggle — only when expanded and data is ready */}
          {expanded && hasData && (
            <button
              onClick={() => setShowTable(v => !v)}
              className="h-8 px-3 text-xs rounded-lg font-medium
                bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                text-gray-800 dark:text-gray-100 transition-colors flex items-center gap-1.5"
              title={showTable ? 'Show Chart' : 'Show Table'}
            >
              {showTable ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Chart
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Table
                </>
              )}
            </button>
          )}

          {/* Export dropdown */}
          {hasData && (
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(v => !v)}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  hover:bg-gray-50 dark:hover:bg-gray-600
                  flex items-center gap-1.5 transition-colors"
                title="Export chart"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border z-20
                      bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {EXPORT_FORMATS.map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        className="w-full px-4 py-2.5 text-left text-xs
                          hover:bg-gray-50 dark:hover:bg-gray-700
                          text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        {fmt === 'excel' ? 'Export to Excel' : `Download as ${fmt.toUpperCase()}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Expand / Collapse */}
          <button
            onClick={onExpand}
            className="h-8 px-4 text-xs rounded-lg font-medium
              bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors
              flex items-center gap-1.5"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 p-5 min-h-0 overflow-hidden" id="cumulative-chart-container">

          {/* Loading */}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
                  Failed to load live data
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{error.message}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Chart */}
          {hasData && !showTable && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="dark:opacity-20 stroke-gray-300 dark:stroke-gray-600"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="fill-gray-600 dark:fill-gray-400"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  tickFormatter={v => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => v.toLocaleString()}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {years.map((year, idx) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name={year}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Table */}
          {hasData && showTable && (
            <div className="h-full overflow-auto">
              <table className="w-full text-center border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-600 dark:bg-blue-700 text-white">
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold sticky left-0 bg-blue-600 dark:bg-blue-700 z-20">
                      Month
                    </th>
                    {years.map(year => (
                      <th key={year} className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map(row => (
                    <tr
                      key={row.month}
                      className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                    >
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium
                        text-gray-800 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                        {row.month}
                      </td>
                      {years.map(year => (
                        <td key={year} className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                          {typeof row[year] === 'number'
                            ? (row[year] as number).toLocaleString()
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Metadata Footer ── */}
      {expanded && !isLoading && apiData?.success && (
        <div className="px-5 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-3">
            <span>
              Live Records:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{apiData.count}</strong>
            </span>
            <span>
              Execution Time:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{apiData.executionTime}</strong>
            </span>
            <span>
              Spectypes:{' '}
              <strong className="text-gray-800 dark:text-gray-200">
                {apiData.filters.spectypes.join(', ')}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};