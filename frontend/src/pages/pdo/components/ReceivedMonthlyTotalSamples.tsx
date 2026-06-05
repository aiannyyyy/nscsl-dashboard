import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  ReferenceArea,
} from "recharts";
import { Download, ChevronDown } from 'lucide-react';
import {
  getMonthlyLabNoCount,
  calculatePercentageDiff,
  type MonthlyDataItem,
} from "../../../services/PDOServices/receivedApi";
import { downloadChart } from '../../../utils/chartDownloadUtils';
import axios from "axios";

const years = Array.from({ length: 16 }, (_, i) => 2028 - i);
const provinces = ["BATANGAS", "CAVITE", "LAGUNA", "QUEZON", "RIZAL", "LOPEZ_NEARBY"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  expanded: boolean;
  onExpand: () => void;
}

interface ChartDataPoint {
  month: string;
  monthIndex: number;
  year1: number;
  year2: number;
}

/**
 * Custom Label Component for bar values
 */
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  if (value === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill={isDarkMode ? '#f3f4f6' : '#1f2937'}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
    >
      {value.toLocaleString()}
    </text>
  );
};

export const MonthlyTotalSamples: React.FC<Props> = ({
  expanded,
  onExpand,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();
  const currentMonthName = months[currentMonthIndex];

  const [yearA, setYearA] = useState(String(currentYear - 1));
  const [yearB, setYearB] = useState(String(currentYear));
  const [province, setProvince] = useState("BATANGAS");
  const [month, setMonth] = useState(currentMonthName);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Store full monthly data
  const [yearAMonthlyData, setYearAMonthlyData] = useState<MonthlyDataItem[]>([]);
  const [yearBMonthlyData, setYearBMonthlyData] = useState<MonthlyDataItem[]>([]);

  const selectedMonthIndex = months.indexOf(month);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📅 Fetching data for:", { yearA, yearB, province, month });

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      let yearAEndDate = `${yearA}-12-31`;
      let yearBEndDate = `${yearB}-12-31`;

      if (Number(yearA) === currentYear) {
        const lastDayOfMonth = new Date(Number(yearA), currentMonth, 0).getDate();
        yearAEndDate = `${yearA}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      }
      
      if (Number(yearB) === currentYear) {
        const lastDayOfMonth = new Date(Number(yearB), currentMonth, 0).getDate();
        yearBEndDate = `${yearB}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      }

      console.log("📊 Date ranges:");
      console.log(`Year A (${yearA}): ${yearA}-01-01 to ${yearAEndDate}`);
      console.log(`Year B (${yearB}): ${yearB}-01-01 to ${yearBEndDate}`);

      let responseA;
      let responseB;

      try {
        responseA = await getMonthlyLabNoCount({
          from: `${yearA}-01-01`,
          to: yearAEndDate,
          province: province,
        });
        console.log("✅ Year A RAW Response:", responseA);
        console.log("✅ Year A Monthly Data Items:", responseA.monthlyData);
      } catch (err: any) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            console.warn(`⚠️ No data found for Year A (${yearA})`);
          } else {
            console.warn(`⚠️ Error fetching Year A (${yearA}):`, err.message);
          }
        }
        responseA = { 
          monthlyData: [], 
          summary: { totalRecords: 0, totalSamples: 0, totalLabNo: 0 },
          parameters: {
            type: 'monthly',
            spectypes: [],
            province: province,
            dateRange: { from: `${yearA}-01-01`, to: yearAEndDate }
          },
          rawData: []
        };
      }

      try {
        responseB = await getMonthlyLabNoCount({
          from: `${yearB}-01-01`,
          to: yearBEndDate,
          province: province,
        });
        console.log("✅ Year B RAW Response:", responseB);
        console.log("✅ Year B Monthly Data Items:", responseB.monthlyData);
      } catch (err: any) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            console.warn(`⚠️ No data found for Year B (${yearB})`);
          } else {
            console.warn(`⚠️ Error fetching Year B (${yearB}):`, err.message);
          }
        }
        responseB = { 
          monthlyData: [], 
          summary: { totalRecords: 0, totalSamples: 0, totalLabNo: 0 },
          parameters: {
            type: 'monthly',
            spectypes: [],
            province: province,
            dateRange: { from: `${yearB}-01-01`, to: yearBEndDate }
          },
          rawData: []
        };
      }

      // ✅ CRITICAL: Store the raw monthly data directly (DO NOT ACCUMULATE)
      const monthlyDataA = responseA.monthlyData || [];
      const monthlyDataB = responseB.monthlyData || [];
      
      setYearAMonthlyData(monthlyDataA);
      setYearBMonthlyData(monthlyDataB);

      console.log("🔍 DIAGNOSTIC - Year A Monthly Data:");
      monthlyDataA.forEach(item => {
        console.log(`  Month ${item.month} (${months[item.month - 1]}): ${item.total_samples} samples`);
      });

      console.log("🔍 DIAGNOSTIC - Year B Monthly Data:");
      monthlyDataB.forEach(item => {
        console.log(`  Month ${item.month} (${months[item.month - 1]}): ${item.total_samples} samples`);
      });

      // ✅ Build chart data - use EXACT values from API, no accumulation
      const dataByMonth: { [key: string]: ChartDataPoint } = {};

      // Initialize all months with zero
      months.forEach((monthName, index) => {
        dataByMonth[monthName] = {
          month: monthName.substring(0, 3),
          monthIndex: index,
          year1: 0,
          year2: 0,
        };
      });

      // Populate Year A data - DIRECT VALUES, NO SUMMING
      monthlyDataA.forEach((item: MonthlyDataItem) => {
        const monthName = months[item.month - 1];
        if (dataByMonth[monthName]) {
          // ✅ Use the exact value from the API
          dataByMonth[monthName].year1 = item.total_samples;
          console.log(`✅ Setting ${monthName} Year A to ${item.total_samples}`);
        }
      });

      // Populate Year B data - DIRECT VALUES, NO SUMMING
      monthlyDataB.forEach((item: MonthlyDataItem) => {
        const monthName = months[item.month - 1];
        if (dataByMonth[monthName]) {
          // ✅ Use the exact value from the API
          dataByMonth[monthName].year2 = item.total_samples;
          console.log(`✅ Setting ${monthName} Year B to ${item.total_samples}`);
        }
      });

      const chartArray = months.map((monthName) => dataByMonth[monthName]);
      setChartData(chartArray);

      console.log("✅ Final Chart Data:", chartArray);

    } catch (err) {
      console.error("❌ Failed to load monthly samples data", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      
      const emptyData = months.map((monthName, index) => ({
        month: monthName.substring(0, 3),
        monthIndex: index,
        year1: 0,
        year2: 0,
      }));
      setChartData(emptyData);
      setYearAMonthlyData([]);
      setYearBMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearA, yearB, province]);

  // ✅ Get data for SELECTED MONTH ONLY
  const getSelectedMonthData = () => {
    const selectedMonthNum = selectedMonthIndex + 1;

    // Find the specific month's data
    const yearAMonthData = yearAMonthlyData.find(item => item.month === selectedMonthNum);
    const yearBMonthData = yearBMonthlyData.find(item => item.month === selectedMonthNum);

    const yearAValue = yearAMonthData?.total_samples || 0;
    const yearBValue = yearBMonthData?.total_samples || 0;

    console.log(`📊 Selected Month (${month}):`, {
      yearA: yearAValue,
      yearB: yearBValue,
      diff: yearBValue - yearAValue
    });

    return {
      yearAValue,
      yearBValue,
      diff: yearBValue - yearAValue,
      percentDiff: calculatePercentageDiff(yearAValue, yearBValue)
    };
  };

  const { yearAValue, yearBValue, diff, percentDiff } = getSelectedMonthData();
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  // Download handler
  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    try {
      if (format === 'excel') {
        const excelData = chartData.map(item => ({
          'Month': months[item.monthIndex],
          [yearA]: item.year1,
          [yearB]: item.year2,
          'Difference': item.year2 - item.year1,
        }));

        // Add totals row
        const year1Total = chartData.reduce((sum, item) => sum + item.year1, 0);
        const year2Total = chartData.reduce((sum, item) => sum + item.year2, 0);
        
        excelData.push({
          'Month': 'TOTAL',
          [yearA]: year1Total,
          [yearB]: year2Total,
          'Difference': year2Total - year1Total,
        });

        await downloadChart({
          elementId: 'monthly-total-samples-chart',
          filename: `Monthly_Total_Samples_${yearA}_vs_${yearB}_${province}`,
          format: 'excel',
          data: excelData,
          sheetName: 'Monthly Data',
        });
      } else {
        await downloadChart({
          elementId: 'monthly-total-samples-chart',
          filename: `Monthly_Total_Samples_${yearA}_vs_${yearB}_${province}`,
          format,
          backgroundColor: '#ffffff',
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
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Monthly Total Samples
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

              <select
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                className="h-8 px-3 text-xs rounded-lg border
                  bg-white dark:bg-gray-700
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Download Button */}
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
                      <button
                        onClick={() => handleDownload('png')}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                          text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                      >
                        <Download size={12} />
                        Download as PNG
                      </button>
                      <button
                        onClick={() => handleDownload('excel')}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                          text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                      >
                        <Download size={12} />
                        Export Data to Excel
                      </button>
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
      <div id="monthly-total-samples-chart" className="flex-1 p-5">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              
              <ReferenceArea
                x1={selectedMonthIndex - 0.5}
                x2={selectedMonthIndex + 0.5}
                fill="#fbbf24"
                fillOpacity={0.15}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              
              <XAxis 
                dataKey="month"
                tick={(props) => {
                  const { x, y, payload } = props;
                  const isSelected = payload.index === selectedMonthIndex;
                  const isDarkMode = document.documentElement.classList.contains('dark');
                  
                  return (
                    <text
                      x={x}
                      y={Number(y) + 10}
                      textAnchor="middle"
                      fill={isSelected ? '#f59e0b' : (isDarkMode ? '#9ca3af' : '#6b7280')}
                      fontSize={12}
                      fontWeight={isSelected ? 700 : 400}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                axisLine={{ stroke: '#d1d5db' }}
                label={{
                  value: 'Month',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 12, fill: '#6b7280' }
                }}
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
                dataKey="year1" 
                name={yearA}
                fill="#3877db"
                radius={[4, 4, 0, 0]}
              >
                <LabelList content={CustomLabel} />
              </Bar>
              
              <Bar 
                dataKey="year2" 
                name={yearB}
                fill="#FFA500"
                radius={[4, 4, 0, 0]}
              >
                <LabelList content={CustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Comparison Table - Shows SELECTED MONTH ONLY */}
      {expanded && !loading && chartData.length > 0 && (
        <div className="px-5 pb-4">
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 italic">
            Showing data for {month} only
          </div>
          <table className="w-full text-sm border-collapse text-center border border-gray-300 dark:border-gray-700">
            <thead className="bg-blue-600 dark:bg-blue-700 text-white">
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">Month</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">{yearA}</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">{yearB}</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">INC/DEC</th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium text-gray-800 dark:text-gray-100">
                  {month}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {yearAValue.toLocaleString()}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {yearBValue.toLocaleString()}
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