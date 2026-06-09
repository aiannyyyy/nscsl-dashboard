// src/components/Laboratory/CumulativeAnnualChart.tsx
import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import {
  useAnnualCensusReceived,
  useAnnualCensusScreened,
  useAnnualCensusInitial,
} from '../../../hooks/LaboratoryHooks/useCumulativeAnnualCencus';
import {
  HISTORICAL_RECEIVED,
  HISTORICAL_SCREENED,
  HISTORICAL_INITIAL,
} from '../../../constants/LaboratoryConstants/cumulativeAnnualCencusData';
import type {
  AnnualReceivedItem,
  AnnualScreenedItem,
  AnnualInitialItem,
} from '../../../constants/LaboratoryConstants/cumulativeAnnualCencusData';
import type { AnnualCensusRow } from '../../../services/LaboratoryServices/cumulativeAnnualCencusService';
import { downloadChart } from '../../../utils/chartDownloadUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CensusType = 'received' | 'screened' | 'initial';

interface ChartRow {
  year: string;
  test6?: number;   // received only — grey bar
  enbs: number;     // orange bar (all types)
  total: number;    // blue line
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

const MONTH_RANGES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'January–February' },
  { value: '03', label: 'January–March' },
  { value: '04', label: 'January–April' },
  { value: '05', label: 'January–May' },
  { value: '06', label: 'January–June' },
  { value: '07', label: 'January–July' },
  { value: '08', label: 'January–August' },
  { value: '09', label: 'January–September' },
  { value: '10', label: 'January–October' },
  { value: '11', label: 'January–November' },
  { value: '12', label: 'January–December' },
];

const CENSUS_CONFIG: Record<CensusType, { label: string; title: string; startYear: number }> = {
  received: {
    label:     'Received',
    title:     'Cumulative Annual Census of Samples Received',
    startYear: 2013,
  },
  screened: {
    label:     'Total Samples Screened',
    title:     'Cumulative Annual Census of TOTAL Samples Screened',
    startYear: 2018,
  },
  initial: {
    label:     'Initial Samples Screened',
    title:     'Cumulative Annual Census of INITIAL Samples Screened',
    startYear: 2018,
  },
};

// ---------------------------------------------------------------------------
// Helpers: merge historical constants + live 2026+ API rows
// ---------------------------------------------------------------------------

function buildReceivedRows(
  liveRows: AnnualCensusRow[],
  monthCap: string
): ChartRow[] {
  // Live API returns TOTAL_SAMPLES per YYYY-MM — aggregate per year, up to monthCap
  const liveByYear = new Map<number, number>();
  liveRows.forEach(r => {
    const [yearStr, month] = r.YEAR_MONTH.split('-');
    if (month > monthCap) return;
    const year = Number(yearStr);
    liveByYear.set(year, (liveByYear.get(year) ?? 0) + r.TOTAL_SAMPLES);
  });

  // Historical rows — cap by monthCap for partial-year display
  // For historical we don't have monthly breakdown, so show full-year totals as-is
  // but for the current live year we use the API sum up to monthCap
  const rows: ChartRow[] = HISTORICAL_RECEIVED.map(h => ({
    year:  h.year.toString(),
    test6: h.test6,
    enbs:  h.enbs,
    total: h.total,
  }));

  // Append live years (2026+)
  liveByYear.forEach((total, year) => {
    rows.push({
      year:  year.toString(),
      test6: 0,
      enbs:  total,
      total,
    });
  });

  return rows.sort((a, b) => Number(a.year) - Number(b.year));
}

function buildScreenedRows(
  liveRows: AnnualCensusRow[],
  monthCap: string
): ChartRow[] {
  const liveByYear = new Map<number, number>();
  liveRows.forEach(r => {
    const [yearStr, month] = r.YEAR_MONTH.split('-');
    if (month > monthCap) return;
    const year = Number(yearStr);
    liveByYear.set(year, (liveByYear.get(year) ?? 0) + r.TOTAL_SAMPLES);
  });

  const rows: ChartRow[] = HISTORICAL_SCREENED.map(h => ({
    year:  h.year.toString(),
    enbs:  h.enbs,
    total: h.total,
  }));

  liveByYear.forEach((total, year) => {
    rows.push({ year: year.toString(), enbs: total, total });
  });

  return rows.sort((a, b) => Number(a.year) - Number(b.year));
}

function buildInitialRows(
  liveRows: AnnualCensusRow[],
  monthCap: string
): ChartRow[] {
  const liveByYear = new Map<number, number>();
  liveRows.forEach(r => {
    const [yearStr, month] = r.YEAR_MONTH.split('-');
    if (month > monthCap) return;
    const year = Number(yearStr);
    liveByYear.set(year, (liveByYear.get(year) ?? 0) + r.TOTAL_SAMPLES);
  });

  const rows: ChartRow[] = HISTORICAL_INITIAL.map(h => ({
    year:  h.year.toString(),
    enbs:  h.enbs,
    total: h.total,
  }));

  liveByYear.forEach((total, year) => {
    rows.push({ year: year.toString(), enbs: total, total });
  });

  return rows.sort((a, b) => Number(a.year) - Number(b.year));
}

// ---------------------------------------------------------------------------
// Custom label renderers
// ---------------------------------------------------------------------------

const renderBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2} y={y - 4}
      textAnchor="middle" fontSize={9} fontWeight="500"
      className="fill-gray-700 dark:fill-gray-300"
    >
      {value.toLocaleString()}
    </text>
  );
};

const renderLineLabel = (props: any) => {
  const { x, y, value } = props;
  if (!value) return null;
  return (
    <text
      x={x} y={y - 10}
      textAnchor="middle" fontSize={11} fontWeight="700"
      fill="#1d4ed8"
    >
      {value.toLocaleString()}
    </text>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CumulativeAnnualChart: React.FC<Props> = ({ expanded, onExpand }) => {
  const [censusType, setCensusType] = useState<CensusType>('received');
  const [monthRange, setMonthRange] = useState(
    MONTH_RANGES[new Date().getMonth()].value
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // All 3 hooks — always fetched so switching is instant
  const receivedQuery = useAnnualCensusReceived();
  const screenedQuery = useAnnualCensusScreened();
  const initialQuery  = useAnnualCensusInitial();

  // Pick the active query based on selected type
  const activeQuery =
    censusType === 'received' ? receivedQuery :
    censusType === 'screened' ? screenedQuery :
    initialQuery;

  const { isLoading, error, refetch } = activeQuery;
  const liveRows: AnnualCensusRow[] = activeQuery.data?.data ?? [];

  // ------------------------------------------------------------------
  // Build chart rows — merge historical constants + live API data
  // ------------------------------------------------------------------
  const chartData: ChartRow[] = useMemo(() => {
    if (censusType === 'received') return buildReceivedRows(liveRows, monthRange);
    if (censusType === 'screened') return buildScreenedRows(liveRows, monthRange);
    return buildInitialRows(liveRows, monthRange);
  }, [censusType, liveRows, monthRange]);

  // ------------------------------------------------------------------
  // Export data
  // ------------------------------------------------------------------
  const exportData = useMemo(() => {
    return chartData.map(row => {
      const out: Record<string, unknown> = { Year: row.year };
      if (censusType === 'received') out['6 Test'] = row.test6 ?? 0;
      out['ENBS']       = row.enbs;
      out['Total']      = row.total;
      return out;
    });
  }, [chartData, censusType]);

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false);
    const filename = `cumulative-annual-${censusType}-${new Date().toISOString().split('T')[0]}`;
    try {
      await downloadChart({
        elementId: 'cumulative-annual-chart-container',
        filename,
        format,
        data: format === 'excel' ? exportData : undefined,
        sheetName: `Annual ${censusType}`,
        backgroundColor: document.documentElement.classList.contains('dark')
          ? '#111827'
          : '#ffffff',
        scale: 2,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const hasData  = !isLoading && !error && chartData.length > 0;
  const config   = CENSUS_CONFIG[censusType];
  const monthLabel = MONTH_RANGES.find(m => m.value === monthRange)?.label ?? '';

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div
      className={`flex flex-col rounded-2xl shadow-lg overflow-hidden
        bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out
        ${expanded ? 'h-[620px]' : 'h-[380px]'}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b
        bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="truncate max-w-xs">{config.title}</span>
          <span className="text-xs font-normal text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
            {monthLabel}
          </span>
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {expanded && (
            <>
              {/* Census type selector — 3 choices matching the 3 backend endpoints */}
              <select
                value={censusType}
                onChange={e => setCensusType(e.target.value as CensusType)}
                className="h-8 px-3 text-xs rounded-lg border font-semibold
                  bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="received">Received</option>
                <option value="screened">Total Samples Screened</option>
                <option value="initial">Initial Samples Screened</option>
              </select>

              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">|</span>

              {/* Month range selector */}
              <select
                value={monthRange}
                onChange={e => setMonthRange(e.target.value)}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_RANGES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </>
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
              >
                <Download size={14} />
                Export
                <ChevronDown size={12} />
              </button>

              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border z-20
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
                        <Download size={14} />
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
              bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div id="cumulative-annual-chart-container" className="flex-1 p-5 min-h-0">

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
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">Failed to load data</p>
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

        {/* Empty */}
        {!isLoading && !error && chartData.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        )}

        {/* Chart */}
        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:opacity-20 stroke-gray-300 dark:stroke-gray-600"
              />
              <XAxis
                dataKey="year"
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

              {/* Grey bar — "6 test" — received only */}
              {censusType === 'received' && (
                <Bar dataKey="test6" stackId="a" fill="#9ca3af" name="6 Test" radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="test6" content={renderBarLabel} position="top" />
                </Bar>
              )}

              {/* Orange bar — ENBS (all types) */}
              <Bar
                dataKey="enbs"
                stackId="a"
                fill="#f97316"
                name="ENBS"
                radius={[4, 4, 0, 0]}
              >
                <LabelList dataKey="enbs" content={renderBarLabel} position="top" />
              </Bar>

              {/* Blue line — TOTAL */}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
                name="TOTAL"
                connectNulls={false}
              >
                <LabelList dataKey="total" content={renderLineLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Metadata footer ── */}
      {expanded && !isLoading && activeQuery.data?.success && (
        <div className="px-5 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-3">
            <span>
              Live Records:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{activeQuery.data.count}</strong>
            </span>
            <span>
              Execution Time:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{activeQuery.data.executionTime}</strong>
            </span>
            <span>
              Period:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{monthLabel}</strong>
            </span>
            <span>
              Type:{' '}
              <strong className="text-gray-800 dark:text-gray-200 capitalize">{config.label}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};