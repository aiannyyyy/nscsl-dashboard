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
  LabelList
} from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import { useCumulativeAnnualCensus } from '../../../hooks/LaboratoryHooks/useCumulativeAnnualCencus';
import { downloadChart } from '../../../utils/chartDownloadUtils';

// ==================== TYPES ====================

type CensusType = 'received' | 'screened' | 'initial';

interface ChartData {
  year: string;
  bar1: number;   // test_6  (received) | screened | initial
  bar2?: number;  // enbs    (received only)
  cumulative: number;
}

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

// ==================== CONFIG ====================

const CENSUS_TYPES: { value: CensusType; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'screened', label: 'Screened' },
  { value: 'initial',  label: 'Initial'  },
];

// Start year per type — data before this year is excluded from the chart
const START_YEAR: Record<CensusType, number> = {
  received: 2013,
  screened: 2018,
  initial:  2018,
};

const MONTH_RANGES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'January-February' },
  { value: '03', label: 'January-March' },
  { value: '04', label: 'January-April' },
  { value: '05', label: 'January-May' },
  { value: '06', label: 'January-June' },
  { value: '07', label: 'January-July' },
  { value: '08', label: 'January-August' },
  { value: '09', label: 'January-September' },
  { value: '10', label: 'January-October' },
  { value: '11', label: 'January-November' },
  { value: '12', label: 'January-December' },
];

const EXPORT_FORMATS = ['png', 'svg', 'excel'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

// ==================== COMPONENT ====================

export const CumulativeAnnualChart: React.FC<Props> = ({ expanded, onExpand }) => {
  const [censusType, setCensusType] = useState<CensusType>('received');
  const [monthRange, setMonthRange]   = useState('January');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { data, isLoading, error, refetch } = useCumulativeAnnualCensus();

  // ---- Transform API data to chart format ----
  const chartData: ChartData[] = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    const selectedMonth = MONTH_RANGES.find(m => m.label === monthRange)?.value || '01';
    const startYear     = START_YEAR[censusType];

    // --- Aggregate full-year bar values per year (filtered by start year) ---
    const yearMap = new Map<string, { test_6: number; enbs: number; screened: number; initial: number }>();

    data.data.forEach(item => {
      const [year] = item.YEAR_MONTH.split('-');
      if (Number(year) < startYear) return; // ✅ exclude years before type's start

      if (!yearMap.has(year)) {
        yearMap.set(year, { test_6: 0, enbs: 0, screened: 0, initial: 0 });
      }
      const y = yearMap.get(year)!;
      y.test_6   += item.TEST_6    || 0;
      y.enbs     += item.ENBS      || 0;
      y.screened += item.CNT_SCREENED  || 0;
      y.initial  += item.CNT_INITIAL   || 0;
    });

    // --- Cumulative line: sum up to selected month for each year ---
    const cumulativeByYear = new Map<string, number>();

    [...data.data]
      .sort((a, b) => a.YEAR_MONTH.localeCompare(b.YEAR_MONTH))
      .forEach(item => {
        const [year, month] = item.YEAR_MONTH.split('-');
        if (Number(year) < startYear) return; // ✅ exclude years before type's start
        if (month > selectedMonth) return;

        const prev = cumulativeByYear.get(year) || 0;

        // Add the right value depending on type
        let val = 0;
        if (censusType === 'received') val = (item.TEST_6 || 0) + (item.ENBS || 0);
        if (censusType === 'screened') val = item.CNT_SCREENED || 0;
        if (censusType === 'initial')  val = item.CNT_INITIAL  || 0;

        cumulativeByYear.set(year, prev + val);
      });

    // --- Build final chart rows ---
    return Array.from(yearMap.entries())
      .map(([year, v]) => {
        if (censusType === 'received') {
          return {
            year,
            bar1: v.test_6,
            bar2: v.enbs,
            cumulative: cumulativeByYear.get(year) || 0,
          };
        }
        if (censusType === 'screened') {
          return { year, bar1: v.screened, cumulative: cumulativeByYear.get(year) || 0 };
        }
        // initial
        return { year, bar1: v.initial, cumulative: cumulativeByYear.get(year) || 0 };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [data, monthRange, censusType]);

  // ---- Bar / line labels per type ----
  const barLabels = useMemo(() => {
    if (censusType === 'received') return { bar1: 'Test 6', bar2: 'ENBS' };
    if (censusType === 'screened') return { bar1: 'Screened' };
    return { bar1: 'Initial' };
  }, [censusType]);

  // ---- Export data ----
  const exportData = useMemo(() => {
    return chartData.map(row => {
      const base: Record<string, unknown> = { Year: row.year };
      base[barLabels.bar1] = row.bar1;
      if (censusType === 'received') base['ENBS'] = row.bar2;
      base['Cumulative'] = row.cumulative || '-';
      return base;
    });
  }, [chartData, barLabels, censusType]);

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false);
    const filename = `cumulative-annual-${censusType}-${monthRange.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    try {
      await downloadChart({
        elementId: 'cumulative-annual-chart-container',
        filename,
        format,
        data: format === 'excel' ? exportData : undefined,
        sheetName: `Annual ${censusType.charAt(0).toUpperCase() + censusType.slice(1)}`,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
        scale: 2,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ---- Custom label renderers ----
  const renderBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
      <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="600"
        className="fill-gray-700 dark:fill-gray-300">
        {value.toLocaleString()}
      </text>
    );
  };

  const renderLineLabel = (props: any) => {
    const { x, y, value } = props;
    if (!value) return null;
    return (
      <text x={x} y={y - 10} textAnchor="middle" fontSize={11} fontWeight="700"
        className="fill-gray-900 dark:fill-gray-100">
        {value.toLocaleString()}
      </text>
    );
  };

  const hasData = !isLoading && !error && chartData.length > 0;

  return (
    <div className={`flex flex-col rounded-2xl shadow-lg overflow-hidden
      bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out
      ${expanded ? "h-[600px]" : "h-[380px]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b
        bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {/* ✅ Title reflects selected type */}
          Cumulative Annual Census — {CENSUS_TYPES.find(t => t.value === censusType)?.label} ({monthRange})
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {expanded && (
            <>
              {/* ✅ Census type selector */}
              <select
                value={censusType}
                onChange={(e) => setCensusType(e.target.value as CensusType)}
                className="h-8 px-3 text-xs rounded-lg border font-semibold
                  bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CENSUS_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">|</span>

              {/* Month range selector */}
              <select
                value={monthRange}
                onChange={(e) => setMonthRange(e.target.value)}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_RANGES.map(r => (
                  <option key={r.label} value={r.label}>{r.label}</option>
                ))}
              </select>
            </>
          )}

          {/* Export Dropdown */}
          {hasData && (
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
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
                        className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
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

          <button
            onClick={onExpand}
            className="h-8 px-4 text-xs rounded-lg font-medium
              bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div id="cumulative-annual-chart-container" className="flex-1 p-5 min-h-0">
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">Failed to load data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{error.message}</p>
              <button onClick={() => refetch()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && chartData.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        )}

        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3"
                className="dark:opacity-20 stroke-gray-300 dark:stroke-gray-600" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }}
                className="fill-gray-600 dark:fill-gray-400" />
              <YAxis tick={{ fontSize: 12 }}
                className="fill-gray-600 dark:fill-gray-400"
                tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              {/* ✅ bar1 always shown (test_6 / screened / initial depending on type) */}
              <Bar dataKey="bar1" stackId="a" fill="#3b82f6" name={barLabels.bar1} radius={[0, 0, 0, 0]}>
                <LabelList dataKey="bar1" content={renderBarLabel} position="top" />
              </Bar>

              {/* ✅ bar2 (ENBS) only shown for received */}
              {censusType === 'received' && (
                <Bar dataKey="bar2" stackId="a" fill="#fffb00" name="ENBS" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="bar2" content={renderBarLabel} position="top" />
                </Bar>
              )}

              {/* Cumulative line */}
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#000"
                strokeWidth={3}
                dot={{ r: 5, fill: '#000' }}
                activeDot={{ r: 7 }}
                name="Cumulative"
                connectNulls={false}
              >
                <LabelList dataKey="cumulative" content={renderLineLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metadata */}
      {expanded && !isLoading && data?.success && (
        <div className="px-5 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-3">
            <span>Total Records: <strong className="text-gray-800 dark:text-gray-200">{data.count}</strong></span>
            <span>Execution Time: <strong className="text-gray-800 dark:text-gray-200">{data.executionTime}</strong></span>
            <span>Period: <strong className="text-gray-800 dark:text-gray-200">{monthRange}</strong></span>
            <span>Type: <strong className="text-gray-800 dark:text-gray-200 capitalize">{censusType}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};