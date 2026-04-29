import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Download, ChevronDown } from 'lucide-react';
import {
  getTwoYearComparisonUpToMonth,
  calculatePercentageDiff,
  getAvailableProvinces,
} from "../../../services/PDOServices/screenedApi";
import { downloadChart } from '../../../utils/chartDownloadUtils';

const years = Array.from({ length: 16 }, (_, i) => 2028 - i);

const cumulativeMonths = [
  "Jan",
  "Jan-Feb",
  "Jan-Mar",
  "Jan-Apr",
  "Jan-May",
  "Jan-Jun",
  "Jan-Jul",
  "Jan-Aug",
  "Jan-Sep",
  "Jan-Oct",
  "Jan-Nov",
  "Jan-Dec",
];

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

type ChartType = "single-province" | "all-provinces";

const CustomLabel = ({ x, y, width, height, value }: any) => {
  const isDarkMode = document.documentElement.classList.contains("dark");
  
  if (height && height > width) {
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={isDarkMode ? "#f9fafb" : "#1f2937"}
        style={{ textShadow: "none" }}
      >
        {value?.toLocaleString()}
      </text>
    );
  }
  
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fill={isDarkMode ? "#f9fafb" : "#1f2937"}
      style={{
        textShadow: isDarkMode ? "0 1px 2px rgba(0,0,0,0.6)" : "none",
      }}
    >
      {value?.toLocaleString()}
    </text>
  );
};

export const CumulativePerProvince: React.FC<Props> = ({
  expanded,
  onExpand,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [yearA, setYearA] = useState((currentYear - 1).toString());
  const [yearB, setYearB] = useState(currentYear.toString());
  const [province, setProvince] = useState("BATANGAS");
  const [monthRange, setMonthRange] = useState(cumulativeMonths[currentMonth]);
  const [chartType, setChartType] = useState<ChartType>("single-province");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  const [yearATotal, setYearATotal] = useState(0);
  const [yearBTotal, setYearBTotal] = useState(0);

  const getFullMonthName = (abbreviatedRange: string): string => {
    const monthMap: { [key: string]: string } = {
      "Jan": "January",
      "Jan-Feb": "February",
      "Jan-Mar": "March",
      "Jan-Apr": "April",
      "Jan-May": "May",
      "Jan-Jun": "June",
      "Jan-Jul": "July",
      "Jan-Aug": "August",
      "Jan-Sep": "September",
      "Jan-Oct": "October",
      "Jan-Nov": "November",
      "Jan-Dec": "December",
    };
    return monthMap[abbreviatedRange] || "December";
  };

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchData();
  }, [chartType, yearA, yearB, province, monthRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (chartType === "single-province") {
        await fetchSingleProvinceData();
      } else {
        await fetchAllProvincesData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      console.error("❌ Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleProvinceData = async () => {
    const fullMonthName = getFullMonthName(monthRange);

    const result = await getTwoYearComparisonUpToMonth(
      parseInt(yearA),
      parseInt(yearB),
      fullMonthName
    );

    const provinceDataA = result.raw.year1.data.cumulativeData?.find(
      (d) => d.province.trim().toUpperCase() === province.toUpperCase()
    );
    const provinceDataB = result.raw.year2.data.cumulativeData?.find(
      (d) => d.province.trim().toUpperCase() === province.toUpperCase()
    );

    const totalA = provinceDataA?.total_samples || 0;
    const totalB = provinceDataB?.total_samples || 0;

    setYearATotal(totalA);
    setYearBTotal(totalB);

    const transformedData = [
      {
        name: province.toUpperCase(),
        [yearA]: totalA,
        [yearB]: totalB,
      },
    ];

    setChartData(transformedData);
  };

  const fetchAllProvincesData = async () => {
    const fullMonthName = getFullMonthName(monthRange);

    const result = await getTwoYearComparisonUpToMonth(
      parseInt(yearA),
      parseInt(yearB),
      fullMonthName
    );

    // ✅ Filter out LOPEZ_NEARBY from Chart 2
    const transformedData = result.formatted
      .filter((item) => item.province.trim().toUpperCase() !== "LOPEZ_NEARBY")
      .map((item) => ({
        name: item.province.trim(),
        [yearA]: item.year1Total,
        [yearB]: item.year2Total,
      }));

    // Calculate totals (also excluding LOPEZ_NEARBY)
    const totalA = transformedData.reduce((sum, item) => sum + item[yearA], 0);
    const totalB = transformedData.reduce((sum, item) => sum + item[yearB], 0);

    setYearATotal(totalA);
    setYearBTotal(totalB);

    if (transformedData.every(item => item[yearA] === 0 && item[yearB] === 0)) {
      console.warn("⚠️ No data found for any province!");
      setError("No data available for the selected years");
      setChartData([]);
    } else {
      setChartData(transformedData);
    }
  };

  const toggleChartType = () => {
    setChartType(chartType === "single-province" ? "all-provinces" : "single-province");
  };

  const getExcelData = () => {
    const data = chartData.map(item => ({
      Province: item.name,
      [yearA]: item[yearA],
      [yearB]: item[yearB],
      Difference: item[yearB] - item[yearA],
      'Change %': calculatePercentageDiff(item[yearA], item[yearB]),
    }));

    data.push({
      Province: 'TOTAL',
      [yearA]: yearATotal,
      [yearB]: yearBTotal,
      Difference: yearBTotal - yearATotal,
      'Change %': calculatePercentageDiff(yearATotal, yearBTotal),
    });

    return data;
  };

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    const chartTitle = chartType === "single-province" 
      ? `Screened_Cumulative_${province}_${monthRange}_${yearA}_vs_${yearB}`
      : `Screened_Cumulative_All_Provinces_${monthRange}_${yearA}_vs_${yearB}`;

    const filename = chartTitle.replace(/\s+/g, '_');

    try {
      if (format === 'excel') {
        const excelData = getExcelData();
        await downloadChart({
          elementId: 'screened-cumulative-per-province-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: 'Screened Cumulative'
        });
      } else {
        await downloadChart({
          elementId: 'screened-cumulative-per-province-chart',
          filename,
          format,
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          scale: 2
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const diff = yearBTotal - yearATotal;
  const percentDiff = calculatePercentageDiff(yearATotal, yearBTotal);
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

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
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Cumulative Per Province
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {expanded && (
            <>
              <select
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={yearA}
                onChange={(e) => setYearA(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">VS</span>

              <select
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={yearB}
                onChange={(e) => setYearB(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {chartType === "single-province" && (
                <select
                  className="h-8 px-3 text-xs rounded-lg border
                    bg-white dark:bg-gray-700
                    border-gray-300 dark:border-gray-600
                    text-gray-800 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                >
                  {getAvailableProvinces().map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}

              <select
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={monthRange}
                onChange={(e) => setMonthRange(e.target.value)}
              >
                {cumulativeMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <button
                onClick={toggleChartType}
                className="h-8 px-4 text-xs rounded-lg font-medium
                  bg-purple-600 hover:bg-purple-700
                  text-white shadow transition-colors flex items-center gap-1.5"
              >
                {chartType === "single-province" ? "Show All Provinces" : "Show Single Province"}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={loading}
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
                    <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border
                      bg-white dark:bg-gray-800
                      border-gray-200 dark:border-gray-700
                      z-20 overflow-hidden"
                    >
                      {(['png', 'svg', 'excel'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => handleDownload(fmt)}
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                            text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                        >
                          <Download size={12} />
                          {fmt === 'excel' ? 'Export Data to Excel' : `Download as ${fmt.toUpperCase()}`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

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
      <div id="screened-cumulative-per-province-chart" className="flex-1 p-5">
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
              <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barGap={8}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              
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
              
              <Bar 
                dataKey={yearA} 
                name={yearA}
                fill="#3877db"
                radius={[4, 4, 0, 0]}
                maxBarSize={150}
              >
                <LabelList content={CustomLabel} />
              </Bar>
              
              <Bar 
                dataKey={yearB} 
                name={yearB}
                fill="#fffb00"
                radius={[4, 4, 0, 0]}
                maxBarSize={150}
              >
                <LabelList content={CustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Comparison Table */}
      {expanded && !loading && chartData.length > 0 && (
        <div className="px-5 pb-4">
          <table className="w-full text-sm border-collapse text-center border border-gray-300 dark:border-gray-700">
            <thead className="bg-blue-600 dark:bg-blue-700 text-white">
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">Year</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">{yearA}</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">{yearB}</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">INC/DEC</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-100">
                  Total Screened
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {yearATotal.toLocaleString()}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {yearBTotal.toLocaleString()}
                </td>
                <td className={`border border-gray-300 dark:border-gray-700 px-3 py-2 font-semibold ${
                  isIncrease ? 'text-green-600 dark:text-green-400' : 
                  isDecrease ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {diff > 0 ? '+' : ''}{diff.toLocaleString()} 
                </td>
                <td className={`border border-gray-300 dark:border-gray-700 px-3 py-2 font-semibold ${
                  isIncrease ? 'text-green-600 dark:text-green-400' : 
                  isDecrease ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {percentDiff} {isIncrease ? 'Increase' : isDecrease ? 'Decrease' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};