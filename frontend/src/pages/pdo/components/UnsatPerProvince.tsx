import React, { useEffect, useState } from "react";
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
} from "recharts";
import { getUnsatProvince } from "../../../services/PDOServices/unsatApi";
import { downloadChart } from "../../../utils/chartDownloadUtils"; // Adjust path as needed

/* ================================
   Helpers
================================ */
const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const years = Array.from({ length: 16 }, (_, i) => 2028 - i);

const getMonthRange = (year: string, month: string) => {
  const monthIndex = months.indexOf(month);
  const y = Number(year);

  const from = new Date(y, monthIndex, 1);
  const to = new Date(y, monthIndex + 1, 0);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return { from: format(from), to: format(to) };
};

// ✅ NEW: Get current month and year
const getCurrentMonthYear = () => {
  const now = new Date();
  return {
    year: now.getFullYear().toString(),
    month: months[now.getMonth()],
  };
};

/* ================================
   Types
================================ */
interface ChartRow {
  province: string;
  period1: number;
  period2: number;
}

/* ================================
   Custom Label with Light/Dark Mode Support
================================ */
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Don't show label if value is 0
  if (value === 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill={isDarkMode ? '#f3f4f6' : '#1f2937'}  // Light gray (#f3f4f6) in dark mode, dark gray (#1f2937) in light mode
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
    >
      {value}
    </text>
  );
};

/* ================================
   Component
================================ */
export const UnsatPerProvince: React.FC = () => {
  // ✅ FIXED: Initialize with current month/year
  const current = getCurrentMonthYear();
  const lastYear = (Number(current.year) - 1).toString();

  const [yearA, setYearA] = useState(lastYear);  // Previous year
  const [yearB, setYearB] = useState(current.year);  // Current year
  const [month, setMonth] = useState(current.month);  // Current month

  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const r1 = getMonthRange(yearA, month);
      const r2 = getMonthRange(yearB, month);

      const res = await getUnsatProvince(r1.from, r1.to, r2.from, r2.to);

      if (!res.rows || !Array.isArray(res.rows)) {
        setChartData([]);
        return;
      }

      const formatted: ChartRow[] = res.rows.map((row: any) => ({
        province: row.COUNTY.trim(),
        period1: row.TOTAL_DISTINCT_UNSAT_PERIOD1,
        period2: row.TOTAL_DISTINCT_UNSAT_PERIOD2,
      }));

      setChartData(formatted);
    } catch (err) {
      console.error("Failed to load Unsat Per Province", err);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearA, yearB, month]);

  const shortMonth = month.substring(0, 3);

  // ✅ NEW: Export handler
  const handleExport = async (format: 'png' | 'svg' | 'excel') => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const backgroundColor = isDarkMode ? '#111827' : '#ffffff'; // gray-900 : white
    
    try {
      await downloadChart({
        elementId: 'unsat-province-chart',
        filename: `Unsat_Per_Province_${shortMonth}_${yearA}_vs_${yearB}`,
        format,
        data: format === 'excel' ? chartData.map(row => ({
          Province: row.province,
          [`${shortMonth} ${yearA}`]: row.period1,
          [`${shortMonth} ${yearB}`]: row.period2,
        })) : undefined,
        sheetName: 'Unsat Per Province',
        backgroundColor,
        scale: 2,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100">
          Unsat Per Province
        </h4>

        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={yearA} 
            onChange={(e) => setYearA(e.target.value)} 
            className="h-8 px-3 text-xs rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">VS</span>

          <select 
            value={yearB} 
            onChange={(e) => setYearB(e.target.value)} 
            className="h-8 px-3 text-xs rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="h-8 px-3 text-xs rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select 
            onChange={(e) => {
              if (e.target.value) {
                handleExport(e.target.value as 'png' | 'excel');
                e.target.value = ''; // Reset after selection
              }
            }}
            className="h-8 px-3 text-xs rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            disabled={loading || chartData.length === 0}
          >
            <option value="">Export</option>
            <option value="png">PNG Image</option>
            <option value="excel">Excel Data</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 h-[470px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            No data available
          </div>
        ) : (
          <div id="unsat-province-chart" className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="province" 
                  tick={{ fill: 'currentColor' }}
                  className="dark:text-gray-300"
                />
                <YAxis 
                  tick={{ fill: 'currentColor' }}
                  className="dark:text-gray-300"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, white)',
                    border: '1px solid var(--tooltip-border, #e5e7eb)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />

                <Bar dataKey="period1" name={`${shortMonth} ${yearA}`} fill="#3877db" radius={[4, 4, 0, 0]}>
                  <LabelList content={CustomLabel} />
                </Bar>

                <Bar dataKey="period2" name={`${shortMonth} ${yearB}`} fill="#FFA500" radius={[4, 4, 0, 0]}>
                  <LabelList content={CustomLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};