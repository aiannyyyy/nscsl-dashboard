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
} from "../../../services/PDOServices/screenedApi";
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
      {value}
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

  // ✅ Per-month totals (not cumulative)
  const [yearAMonthTotal, setYearAMonthTotal] = useState(0);
  const [yearBMonthTotal, setYearBMonthTotal] = useState(0);

  const selectedMonthIndex = months.indexOf(month);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

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

      const emptyResponse = (year: string, endDate: string) => ({
        monthlyData: [],
        summary: { totalRecords: 0, totalSamples: 0, totalLabNo: 0 },
        parameters: {
          type: 'monthly',
          spectypes: [],
          province,
          dateRange: { from: `${year}-01-01`, to: endDate }
        },
        rawData: []
      });

      let responseA;
      let responseB;

      try {
        responseA = await getMonthlyLabNoCount({
          from: `${yearA}-01-01`,
          to: yearAEndDate,
          province,
        });
      } catch {
        responseA = emptyResponse(yearA, yearAEndDate);
      }

      try {
        responseB = await getMonthlyLabNoCount({
          from: `${yearB}-01-01`,
          to: yearBEndDate,
          province,
        });
      } catch {
        responseB = emptyResponse(yearB, yearBEndDate);
      }

      // Build chart data
      const dataByMonth: { [key: string]: ChartDataPoint } = {};
      months.forEach((monthName, index) => {
        dataByMonth[monthName] = {
          month: monthName.substring(0, 3),
          monthIndex: index,
          year1: 0,
          year2: 0,
        };
      });

      responseA.monthlyData?.forEach((item: MonthlyDataItem) => {
        const monthName = months[item.month - 1];
        if (dataByMonth[monthName]) dataByMonth[monthName].year1 = item.total_samples;
      });

      responseB.monthlyData?.forEach((item: MonthlyDataItem) => {
        const monthName = months[item.month - 1];
        if (dataByMonth[monthName]) dataByMonth[monthName].year2 = item.total_samples;
      });

      const chartArray = months.map((monthName) => dataByMonth[monthName]);
      setChartData(chartArray);

      // ✅ Find exact value for the selected month only
      const selectedMonthNum = selectedMonthIndex + 1;

      const monthAItem = responseA.monthlyData?.find(
        (item: MonthlyDataItem) => item.month === selectedMonthNum
      );
      const monthBItem = responseB.monthlyData?.find(
        (item: MonthlyDataItem) => item.month === selectedMonthNum
      );

      setYearAMonthTotal(monthAItem?.total_samples ?? 0);
      setYearBMonthTotal(monthBItem?.total_samples ?? 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      const emptyData = months.map((monthName, index) => ({
        month: monthName.substring(0, 3),
        monthIndex: index,
        year1: 0,
        year2: 0,
      }));
      setChartData(emptyData);
      setYearAMonthTotal(0);
      setYearBMonthTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearA, yearB, province, month]);

  const diff = yearBMonthTotal - yearAMonthTotal;
  const percentDiff = calculatePercentageDiff(yearAMonthTotal, yearBMonthTotal);
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      if (format === 'excel') {
        const excelData = chartData.map((item, index) => ({
          'Month': months[index],
          [yearA]: item.year1,
          [yearB]: item.year2,
          'Difference': item.year2 - item.year1,
        }));

        await downloadChart({
          elementId: 'monthly-total-screened-chart',
          filename: `Monthly_Total_Screened_${yearA}_vs_${yearB}_${province}_${month}`,
          format: 'excel',
          data: excelData,
          sheetName: 'Monthly Data',
        });
      } else {
        await downloadChart({
          elementId: 'monthly-total-screened-chart',
          filename: `Monthly_Total_Screened_${yearA}_vs_${yearB}_${province}_${month}`,
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
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
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
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
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
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
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
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
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
                    <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
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
      <div id="monthly-total-screened-chart" className="flex-1 p-5">
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

              <Bar dataKey="year1" name={yearA} fill="#3877db" radius={[4, 4, 0, 0]}>
                <LabelList content={CustomLabel} />
              </Bar>

              <Bar dataKey="year2" name={yearB} fill="#fffb00" radius={[4, 4, 0, 0]}>
                <LabelList content={CustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ✅ Single-row table — shows selected month's data only (not cumulative) */}
      {expanded && !loading && chartData.length > 0 && (
        <div className="px-5 pb-4">
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
            Showing data for {month} only
          </div>
          <table className="w-full text-sm border-collapse text-center border border-gray-300 dark:border-gray-700">
            <thead className="bg-blue-600 dark:bg-blue-700 text-white">
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold">Period</th>
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
                  {yearAMonthTotal.toLocaleString()}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {yearBMonthTotal.toLocaleString()}
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
                  {percentDiff} {isIncrease ? '↑' : isDecrease ? '↓' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};