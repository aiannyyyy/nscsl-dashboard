import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Download, ChevronDown } from 'lucide-react';
import { getCarListGrouped, getMonthDateRange } from "../../../services/PDOServices/carListApi";
import { downloadChart } from '../../../utils/chartDownloadUtils';

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40'
];

interface CorrectiveActionReportChartProps {
  refreshTrigger?: number;
  month: string;
  year: string;
  province?: string;
  status?: string;  // ← added
}

export const CorrectiveActionReportChart: React.FC<CorrectiveActionReportChartProps> = ({
  refreshTrigger = 0,
  month,
  year,
  province,
  status,  // ← added
}) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    fetchData();
  }, [month, year, province, status, refreshTrigger]); // ← added status

  const fetchData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const dateRange = getMonthDateRange(month, year);
      const provinceFilter = !province || province === "all" ? undefined : province;
      const statusFilter = !status || status === "" ? undefined : status;  // ← added

      if (dateRange) {
        const result = await getCarListGrouped(dateRange.start, dateRange.end, provinceFilter, statusFilter); // ← added statusFilter

        const chartData = result
          .filter((item: any) => item.sub_code1)
          .map((item: any) => ({
            name: item.sub_code1,
            value: item.count,
          }));

        setData(chartData);
      }
    } catch (err) {
      console.error("Error fetching CAR data:", err);
      setError("Failed to load chart data");
    } finally {
      setIsLoading(false);
    }
  };

  const totalRecords = data.reduce((sum, item) => sum + item.value, 0);

  const filterLabel = [
    `${month} ${year}`,
    province && province !== "all" ? province : "All Provinces",
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "All Status",  // ← added
  ].join(" · ");

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);

    try {
      const statusText = status ? `_${status}` : '';
      const provinceText = province && province !== 'all' ? `_${province}` : '';
      const filename = `CAR_${month}_${year}${provinceText}${statusText}`;

      if (format === 'excel') {
        const excelData = data.map(item => ({
          'Category': item.name,
          'Count': item.value,
          'Percentage': `${((item.value / totalRecords) * 100).toFixed(2)}%`,
        }));

        await downloadChart({
          elementId: 'car-chart',
          filename,
          format: 'excel',
          data: excelData,
          sheetName: 'CAR Data',
        });
      } else {
        await downloadChart({
          elementId: 'car-chart',
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

  const renderCustomLabel = ({ percent }: any) => `${(percent * 100).toFixed(0)}%`;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg h-[550px]">
      {/* Header */}
      <div className="flex justify-between items-start px-5 py-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100">
            Corrective Action Reports
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {filterLabel}
          </p>
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
                    text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2">
                  <Download size={12} /> Download as PNG
                </button>
                <button onClick={() => handleDownload('svg')}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2">
                  <Download size={12} /> Download as SVG
                </button>
                <button onClick={() => handleDownload('excel')}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2">
                  <Download size={12} /> Export Data to Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div id="car-chart" className="mx-5 mt-4 h-[400px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-red-500">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-gray-400 dark:text-gray-500">
              No data available for selected period
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? [`${value} records`, 'Count'] : ['0 records', 'Count']
                }
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, white)',
                  border: '1px solid var(--tooltip-border, #e5e7eb)',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 mt-3">
        Total Records: <span className="font-semibold text-blue-600">{totalRecords}</span>
      </div>
    </div>
  );
};