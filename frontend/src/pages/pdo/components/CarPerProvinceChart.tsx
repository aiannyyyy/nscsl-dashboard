import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Download, ChevronDown } from 'lucide-react';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import { getCarListGroupedByProvince, getMonthDateRange } from "../../../services/PDOServices/carListApi";

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C23373', '#45B7D1'
];

interface CarPerProvinceChartProps {
  refreshTrigger?: number;
  month: string;
  year: string;
  status: string;
  province?: string; // ← added
}

export const CarPerProvinceChart: React.FC<CarPerProvinceChartProps> = ({
  refreshTrigger = 0,
  month,
  year,
  status,
  province, // ← added
}) => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    fetchData();
  }, [status, month, year, province, refreshTrigger]); // ← added province

  const fetchData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const dateRange = getMonthDateRange(month, year);
      const provinceFilter = !province || province === "all" ? undefined : province; // ← normalize

      const result = dateRange && month
        ? await getCarListGroupedByProvince(status || undefined, dateRange.start, dateRange.end, provinceFilter) // ← pass provinceFilter
        : await getCarListGroupedByProvince(status || undefined, undefined, undefined, provinceFilter);          // ← pass provinceFilter

      const chartData = result.map(item => ({
        name: item.province,
        value: item.count,
      }));

      setData(chartData);
    } catch (err) {
      console.error("Error fetching province data:", err);
      setError("Failed to load chart data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    try {
      const statusText = status ? `_${status}` : '';
      const filename = `CAR_Per_Province_${month}_${year}${statusText}`;

      if (format === 'excel') {
        const excelData = data.map((item, index) => ({
          'Rank': index + 1,
          'Province': item.name,
          'Count': item.value,
          'Percentage': `${((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(2)}%`,
        }));

        await downloadChart({
          elementId: 'car-province-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: 'CAR Per Province',
        });
      } else {
        await downloadChart({
          elementId: 'car-province-chart',
          filename,
          format,
          backgroundColor: '#ffffff',
          scale: 2,
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, outerRadius, value, name } = props;
    if (!name || value === undefined) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius! + 20;
    const x = cx! + radius * Math.cos(-midAngle! * RADIAN);
    const y = cy! + radius * Math.sin(-midAngle! * RADIAN);
    const isDark = document.documentElement.classList.contains("dark");

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? "#f3f4f6" : "#333"}
        textAnchor={x > cx! ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name}: ${value}`}
      </text>
    );
  };

  const totalRecords = data.reduce((sum, item) => sum + item.value, 0);

  const filterLabel = [
    `${month} ${year}`,
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "All Status",
    province && province !== "all" ? province : "All Provinces",
  ].join(" · ");

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
      {/* Header */}
      <div className="flex justify-between items-start px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100">
            CAR Per Province
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{filterLabel}</p>
        </div>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isLoading || data.length === 0}
            className="h-8 px-3 text-xs rounded-full border
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
                bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
              >
                <button onClick={() => handleDownload('png')}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300 transition-colors">
                  Download as PNG
                </button>
                <button onClick={() => handleDownload('svg')}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300 transition-colors">
                  Download as SVG
                </button>
                <button onClick={() => handleDownload('excel')}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300 transition-colors">
                  Export Data to Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div id="car-province-chart" className="mx-5 mt-4 h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-center">
        {isLoading ? (
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        ) : error ? (
          <span className="text-sm text-red-500">{error}</span>
        ) : data.length === 0 ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">No data available</span>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      {data.length > 0 && !isLoading && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 pb-3">
          Total Provinces: <span className="font-semibold text-blue-600">{data.length}</span>
          {' | '}
          Total Records: <span className="font-semibold text-blue-600">{totalRecords}</span>
        </div>
      )}
    </div>
  );
};