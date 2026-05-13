import React, { useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import { useYTDComparison } from '../../../hooks/LaboratoryHooks/useYTDSampleComparison';
import type { YTDSampleType } from '../../../hooks/LaboratoryHooks/useYTDSampleComparison';
import { downloadChart } from '../../../utils/chartDownloadUtils';

interface MonthData {
  month: string;
  year1: number;
  year2: number;
  percentDiff: number;
}

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

// ✅ Centralized type config — add new types here only
const SAMPLE_TYPES: { value: YTDSampleType; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'screened', label: 'Screened' },
  { value: 'initial',  label: 'Initial'  }
];

// ✅ Lookup for header title display
const TYPE_LABELS: Record<YTDSampleType, string> = {
  received: 'Received',
  screened: 'Screened',
  initial:  'Initial'
};

export const YTDComparisonChart: React.FC<Props> = ({ expanded, onExpand }) => {
  const currentYear = new Date().getFullYear();

  const [year1, setYear1] = useState(currentYear - 1);
  const [year2, setYear2] = useState(currentYear);
  const [sampleType, setSampleType] = useState<YTDSampleType>('received');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 12 }, (_, i) => currentYear - i);

  const {
    tableData,
    isLoading,
    error
  } = useYTDComparison({
    year1,
    year2,
    type: sampleType,
    enabled: true
  });

  // Transform data for the chart
  const chartData: MonthData[] = React.useMemo(() => {
    if (!tableData) return [];

    return tableData.map(row => ({
      month: row.monthShort,
      year1: row.year1,
      year2: row.year2,
      percentDiff: row.percentChangeValue
    }));
  }, [tableData]);

  // Prepare data for Excel export
  const excelData = React.useMemo(() => {
    if (!tableData) return [];

    return tableData.map(row => ({
      Month: row.month,
      [year1]: row.year1,
      [year2]: row.year2,
      Difference: row.difference,
      'Percent Change': row.percentChange
    }));
  }, [tableData, year1, year2]);

  // Custom label renderer
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="600"
        className="fill-gray-700 dark:fill-gray-300"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  // Handle chart download
  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    const filename = `ytd-${sampleType}-samples-${year1}-vs-${year2}`;

    try {
      if (format === 'excel') {
        await downloadChart({
          elementId: 'ytd-comparison-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: `YTD ${TYPE_LABELS[sampleType]}`,
        });
      } else {
        await downloadChart({
          elementId: 'ytd-comparison-chart',
          filename,
          format,
          backgroundColor: document.documentElement.classList.contains('dark')
            ? '#1f2937'
            : '#ffffff',
          scale: 2,
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl shadow-lg overflow-hidden
        bg-white dark:bg-gray-900
        transition-all duration-300 ease-in-out
        ${expanded ? "h-[600px]" : "h-[380px]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b
        bg-gray-50 dark:bg-gray-800
        border-gray-200 dark:border-gray-700"
      >
        {/* Title — ✅ now uses TYPE_LABELS lookup instead of ternary chain */}
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          YTD {TYPE_LABELS[sampleType]} Samples
        </h3>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {expanded && (
            <>
              {/* Sample Type Dropdown — ✅ driven by SAMPLE_TYPES array */}
              <select
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value as YTDSampleType)}
                className="h-8 px-3 text-xs rounded-lg border font-semibold
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SAMPLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">|</span>

              {/* Year 1 */}
              <select
                value={year1}
                onChange={(e) => setYear1(Number(e.target.value))}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">VS</span>

              {/* Year 2 */}
              <select
                value={year2}
                onChange={(e) => setYear2(Number(e.target.value))}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isLoading || chartData.length === 0}
              className="h-8 px-3 text-xs rounded-lg border
                bg-white dark:bg-gray-700
                border-gray-300 dark:border-gray-600
                text-gray-800 dark:text-gray-100
                hover:bg-gray-50 dark:hover:bg-gray-600
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>

            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDownloadMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border
                  bg-white dark:bg-gray-800
                  border-gray-200 dark:border-gray-700
                  z-20 overflow-hidden"
                >
                  {(['png', 'svg', 'excel'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleDownload(fmt)}
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

          {/* Expand / Collapse */}
          <button
            onClick={onExpand}
            className="h-8 px-4 text-xs rounded-lg font-medium
              bg-blue-600 hover:bg-blue-700
              text-white shadow transition-colors flex items-center gap-1.5"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div id="ytd-comparison-chart" ref={chartRef} className="flex-1 p-5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">Error loading chart data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error.message}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="year1" fill="#3b82f6" name={year1.toString()} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="year1" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="year2" fill="#fffb00" name={year2.toString()} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="year2" content={renderCustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Data Table — only visible when expanded */}
      {expanded && !isLoading && chartData.length > 0 && (
        <div className="px-5 pb-4 overflow-x-auto">
          <table className="w-full text-center border-collapse text-sm">
            <thead>
              <tr className="bg-blue-600 dark:bg-blue-700 text-white">
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">Year</th>
                {chartData.map((data) => (
                  <th key={data.month} className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">
                    {data.month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{year1}</td>
                {chartData.map((data) => (
                  <td key={data.month} className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                    {data.year1.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{year2}</td>
                {chartData.map((data) => (
                  <td key={data.month} className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                    {data.year2.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-100">% Diff</td>
                {chartData.map((data) => (
                  <td
                    key={data.month}
                    className={`border border-gray-300 dark:border-gray-700 px-3 py-2 font-semibold ${
                      data.percentDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {data.percentDiff >= 0 ? '+' : ''}{data.percentDiff.toFixed(1)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};