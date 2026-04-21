import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { downloadChart } from '../../../utils/chartDownloadUtils';

interface TimelinessRecord {
  month: string;
  aoc_mean_year1: number; aoc_mean_year2: number;
  aoc_median_year1: number; aoc_median_year2: number;
  aoc_mode_year1: number; aoc_mode_year2: number;
  transit_mean_year1: number; transit_mean_year2: number;
  transit_median_year1: number; transit_median_year2: number;
  transit_mode_year1: number; transit_mode_year2: number;
  aur_mean_year1: number; aur_mean_year2: number;
  aur_median_year1: number; aur_median_year2: number;
  aur_mode_year1: number; aur_mode_year2: number;
}

interface ApiResponse {
  success: boolean;
  data: TimelinessRecord[];
  executionTime: string;
  recordCount: number;
}

const months = [
  { label: 'Jan', value: '1' },
  { label: 'Feb', value: '2' },
  { label: 'Mar', value: '3' },
  { label: 'Apr', value: '4' },
  { label: 'May', value: '5' },
  { label: 'Jun', value: '6' },
  { label: 'Jul', value: '7' },
  { label: 'Aug', value: '8' },
  { label: 'Sept', value: '9' },
  { label: 'Oct', value: '10' },
  { label: 'Nov', value: '11' },
  { label: 'Dec', value: '12' },
];

// Builds cumulative range options: "January", "January - February", etc.
const cumulativeRangeOptions = months.map((m, i) => ({
  label: i === 0 ? m.label : `Jan - ${m.label}`,
  endMonth: m.value, // startMonth is always '1'
}));

export const TimelinessCharts: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString();

  const [year1, setYear1] = useState((currentYear - 1).toString());
  const [year2, setYear2] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);         // for county mode
  const [selectedEndMonth, setSelectedEndMonth] = useState(currentMonth);   // for summary mode (endMonth; startMonth always = 1)
  const [selectedProvince, setSelectedProvince] = useState('Batangas');
  const [viewMode, setViewMode] = useState<'county' | 'summary'>('county');

  const [data, setData] = useState<TimelinessRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const years = ['2029', '2028', '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];
  const provinces = ['Cavite', 'Laguna', 'Batangas', 'Rizal', 'Quezon'];
  const charts = [
    { title: 'Age of Collection', id: 'aoc' },
    { title: 'Transit Time', id: 'transit' },
    { title: 'Age Upon Receipt', id: 'aur' },
  ];

  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof document !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '';
        if (viewMode === 'county') {
          url = `/api/timeliness?year1=${year1}&year2=${year2}&month=${selectedMonth}&province=${selectedProvince}`;
        } else {
          // startMonth always 1, endMonth is selectedEndMonth
          url = `/api/timeliness/summary?year1=${year1}&year2=${year2}&startMonth=1&endMonth=${selectedEndMonth}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch data');

        const result: ApiResponse = await response.json();
        if (!result || !Array.isArray(result.data)) {
          setData([]);
        } else {
          setData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year1, year2, selectedMonth, selectedEndMonth, selectedProvince, viewMode]);

  const getChartData = (chartType: string) => {
    if (!data || data.length === 0) return [];
    const record = data[0];
    if (chartType === 'aoc') return [
      { name: 'Mean',   [year1]: record.aoc_mean_year1,   [year2]: record.aoc_mean_year2 },
      { name: 'Median', [year1]: record.aoc_median_year1, [year2]: record.aoc_median_year2 },
      { name: 'Mode',   [year1]: record.aoc_mode_year1,   [year2]: record.aoc_mode_year2 },
    ];
    if (chartType === 'transit') return [
      { name: 'Mean',   [year1]: record.transit_mean_year1,   [year2]: record.transit_mean_year2 },
      { name: 'Median', [year1]: record.transit_median_year1, [year2]: record.transit_median_year2 },
      { name: 'Mode',   [year1]: record.transit_mode_year1,   [year2]: record.transit_mode_year2 },
    ];
    if (chartType === 'aur') return [
      { name: 'Mean',   [year1]: record.aur_mean_year1,   [year2]: record.aur_mean_year2 },
      { name: 'Median', [year1]: record.aur_median_year1, [year2]: record.aur_median_year2 },
      { name: 'Mode',   [year1]: record.aur_mode_year1,   [year2]: record.aur_mode_year2 },
    ];
    return [];
  };

  const getExcelData = (chartType: string) =>
    getChartData(chartType).map(item => ({
      Metric: item.name,
      [year1]: item[year1],
      [year2]: item[year2],
    }));

  const handleDownload = async (chartId: string, format: 'png' | 'svg' | 'excel') => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;

    const rangeLabel = viewMode === 'summary'
      ? cumulativeRangeOptions.find(o => o.endMonth === selectedEndMonth)?.label ?? selectedEndMonth
      : months.find(m => m.value === selectedMonth)?.label ?? selectedMonth;

    const filename = viewMode === 'county'
      ? `${chart.title.replace(/\s+/g, '_')}_${selectedProvince}_${rangeLabel}_${year1}_vs_${year2}`
      : `${chart.title.replace(/\s+/g, '_')}_Summary_${rangeLabel}_${year1}_vs_${year2}`;

    try {
      if (format === 'excel') {
        await downloadChart({ elementId: `chart-${chartId}`, filename, format: 'excel', data: getExcelData(chartId), sheetName: chart.title });
      } else {
        await downloadChart({ elementId: `chart-${chartId}`, filename, format, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', scale: 2 });
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || typeof value !== 'number') return null;
    return (
      <text x={x + width / 2} y={y - 5} fill={isDarkMode ? '#e5e7eb' : '#1f2937'} textAnchor="middle" fontSize={10} fontWeight={500}>
        {value.toFixed(2)}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
              <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value.toFixed(2)} days
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getChartColors = (chartId: string) => {
    if (chartId === 'aoc') return { year1Color: '#93c5fd', year2Color: '#f9a8d4' };
    if (chartId === 'transit') return { year1Color: '#5eead4', year2Color: '#fb923c' };
    return { year1Color: '#c4b5fd', year2Color: '#fde047' };
  };

  // Label shown in the badge and filename
  const summaryRangeLabel = cumulativeRangeOptions.find(o => o.endMonth === selectedEndMonth)?.label ?? 'Jan';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors min-h-[300px]">

      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Timeliness of NBS</h4>
            {viewMode === 'county' && (
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                {selectedProvince}
              </span>
            )}
            {viewMode === 'summary' && (
              <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                All Counties · {summaryRangeLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle View */}
            <button
              onClick={() => setViewMode(viewMode === 'county' ? 'summary' : 'county')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {viewMode === 'county' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Show Summary
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to County View
                </>
              )}
            </button>

            {/* Year dropdowns */}
            <select value={year1} onChange={(e) => setYear1(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs border-0 focus:ring-2 focus:ring-blue-500 font-medium">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold px-1">VS</span>

            <select value={year2} onChange={(e) => setYear2(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs border-0 focus:ring-2 focus:ring-blue-500 font-medium">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Month selector — switches based on viewMode */}
            {viewMode === 'county' ? (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs border-0 focus:ring-2 focus:ring-blue-500 font-medium">
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            ) : (
              <select value={selectedEndMonth} onChange={(e) => setSelectedEndMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs border-0 focus:ring-2 focus:ring-blue-500 font-medium">
                {cumulativeRangeOptions.map(o => (
                  <option key={o.endMonth} value={o.endMonth}>{o.label}</option>
                ))}
              </select>
            )}

            {/* Province — only visible in county mode */}
            {viewMode === 'county' && (
              <select value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs border-0 focus:ring-2 focus:ring-blue-500 font-medium">
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="p-5">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Loading data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {charts.map((chart) => {
              const chartData = getChartData(chart.id);
              const colors = getChartColors(chart.id);

              return (
                <div key={chart.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{chart.title}</h5>
                    <div className="relative group">
                      <button className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export</span>
                      </button>
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button onClick={() => handleDownload(chart.id, 'png')} className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors">Download as PNG</button>
                        <button onClick={() => handleDownload(chart.id, 'svg')} className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Download as SVG</button>
                        <button onClick={() => handleDownload(chart.id, 'excel')} className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors">Export to Excel</button>
                      </div>
                    </div>
                  </div>

                  <div id={`chart-${chart.id}`} className="h-52 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                          <Bar dataKey={year1} fill={colors.year1Color} radius={[4, 4, 0, 0]} label={<CustomLabel />} />
                          <Bar dataKey={year2} fill={colors.year2Color} radius={[4, 4, 0, 0]} label={<CustomLabel />} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-3xl mb-2">📊</div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">No data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};