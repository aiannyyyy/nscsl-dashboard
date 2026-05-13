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
import { useLabTotalDailySamples } from '../../../hooks/LaboratoryHooks';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import type { SampleType } from '../../../services/LaboratoryServices/labTotalDailySamples';

interface ChartData {
  day: string;
  year1: number;
  year2: number;
}

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

export const DailyComparisonChart: React.FC<Props> = ({ expanded, onExpand }) => {
  // Get current year and month dynamically
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
  
  const [year1, setYear1] = useState((currentYear - 1).toString());
  const [year2, setYear2] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth);
  const [sampleType, setSampleType] = useState<SampleType>('received');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  
  const chartRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 12 }, (_, i) => (currentYear - i).toString());
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const sampleTypes: { value: SampleType; label: string }[] = [
    { value: 'received', label: 'Received' },
    { value: 'screened', label: 'Screened' },
    { value: 'initial', label: 'Initial' },
  ];

  // Use React Query for both years
  const { data: year1Response, isLoading: isLoadingYear1, error: errorYear1 } = useLabTotalDailySamples({
    year: year1,
    month: month,
    sampleType: sampleType
  });

  const { data: year2Response, isLoading: isLoadingYear2, error: errorYear2 } = useLabTotalDailySamples({
    year: year2,
    month: month,
    sampleType: sampleType
  });

  // Combine loading and error states
  const loading = isLoadingYear1 || isLoadingYear2;
  const error = errorYear1 || errorYear2;

  // Helper function to get days in month
  const getDaysInMonth = (year: string, monthName: string): number => {
    const monthIndex = months.indexOf(monthName.toLowerCase());
    return new Date(parseInt(year), monthIndex + 1, 0).getDate();
  };

  // Process chart data
  const chartData: ChartData[] = React.useMemo(() => {
    if (!year1Response?.data || !year2Response?.data) return [];

    // Determine the number of days in the month
    const daysInMonth = Math.max(
      getDaysInMonth(year1, month),
      getDaysInMonth(year2, month)
    );

    // Create a map for year2 data for easy lookup
    const year2Map = new Map(
      year2Response.data.map(item => [item.RECEIVED_DATE.split('-')[2], item.TOTAL_SAMPLES])
    );

    // Create a map for year1 data
    const year1Map = new Map(
      year1Response.data.map(item => [item.RECEIVED_DATE.split('-')[2], item.TOTAL_SAMPLES])
    );

    // Create data for ALL days in the month
    const allDaysData: ChartData[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      allDaysData.push({
        day: dayStr,
        year1: year1Map.get(dayStr) || 0,
        year2: year2Map.get(dayStr) || 0
      });
    }

    return allDaysData;
  }, [year1Response, year2Response, year1, year2, month]);

  // Custom label renderer for bar labels - positioned lower
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    
    // Only show label if value > 0
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
        {value}
      </text>
    );
  };

  // Handle chart download
  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    // Capitalize month for filename
    const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
    const filename = `daily-${sampleType}-samples-${monthCapitalized}-${year1}-vs-${year2}`;

    try {
      if (format === 'excel') {
        // Prepare data for Excel export
        const excelData = chartData.map(item => ({
          Day: `${monthCapitalized.substring(0, 3)} ${item.day}`,
          [year1]: item.year1,
          [year2]: item.year2,
        }));

        await downloadChart({
          elementId: 'daily-comparison-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: `${sampleType} Samples`,
        });
      } else {
        await downloadChart({
          elementId: 'daily-comparison-chart',
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

  // Capitalize month for display
  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1);

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
        {/* Title */}
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Daily {sampleType === 'received' ? 'Received' : sampleType === 'screened' ? 'Screened' : 'Initial'}{' '} Samples
        </h3>

        {/* Controls */}                                                                                                                                                                
        <div className="flex items-center gap-2 flex-wrap">
          {expanded && (
            <>
              {/* Sample Type Dropdown */}
              <select
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value as SampleType)}
                className="h-8 px-3 text-xs rounded-lg border font-semibold
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sampleTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">|</span>

              {/* Year 1 */}
              <select
                value={year1}
                onChange={(e) => setYear1(e.target.value)}
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
                onChange={(e) => setYear2(e.target.value)}
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

              {/* Month */}
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={loading || chartData.length === 0}
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

            {/* Dropdown Menu */}
            {showDownloadMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDownloadMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border
                  bg-white dark:bg-gray-800
                  border-gray-200 dark:border-gray-700
                  z-20 overflow-hidden"
                >
                  <button
                    onClick={() => handleDownload('png')}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                      text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download as PNG
                  </button>
                  <button
                    onClick={() => handleDownload('svg')}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                      text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download as SVG
                  </button>
                  <button
                    onClick={() => handleDownload('excel')}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                      text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    Export to Excel
                  </button>
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
      <div id="daily-comparison-chart" ref={chartRef} className="flex-1 p-5">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-500 dark:text-red-400">
                {error instanceof Error ? error.message : 'Failed to load chart data'}
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="day"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                interval={0}
                tickFormatter={(value) => {
                  return `${displayMonth.substring(0, 3)} ${value}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                labelFormatter={(value) => `${displayMonth} ${value}`}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="year1" fill="#3b82f6" name={year1} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="year1" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="year2" fill="#fffb00" name={year2} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="year2" content={renderCustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};