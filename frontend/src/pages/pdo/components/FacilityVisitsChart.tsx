import React, { useState, useEffect, useCallback } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import facilityVisitsService from '../../../services/PDOServices/facilityVisitsService';
import type { StatusCount } from '../../../services/PDOServices/facilityVisitsService';
import { downloadChart } from '../../../utils/chartDownloadUtils';

interface FacilityVisitsChartProps {
  refreshTrigger?: number;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [
  '2029', '2028', '2027', '2026', '2025', '2024',
  '2023', '2022', '2021', '2020', '2019', '2018',
];

const PROVINCES = ['All Provinces', 'Cavite', 'Laguna', 'Batangas', 'Rizal', 'Quezon'];

/**
 * Build a "YYYY-MM-DD" string from year/month/day WITHOUT using new Date().
 * new Date(year, month, day) would work locally, but toISOString() converts to UTC,
 * which can shift the date backward by up to 8 hours in UTC+8 (PH time).
 * We just format the parts manually to guarantee the correct local-calendar date.
 */
const toLocalDateString = (year: number, month: number, day: number): string => {
  const mm = String(month + 1).padStart(2, '0'); // month is 0-based
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

/**
 * Returns the last day of a given month/year without timezone issues.
 * month is 0-based (0 = January).
 */
const lastDayOfMonth = (year: number, month: number): number => {
  // Day 0 of the next month = last day of this month
  return new Date(year, month + 1, 0).getDate();
};

export const FacilityVisitsChart: React.FC<FacilityVisitsChartProps> = ({
  refreshTrigger,
  selectedProvince,
  onProvinceChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
}) => {
  const [statusData, setStatusData] = useState<StatusCount>({ active: 0, inactive: 0, closed: 0 });
  const [loading, setLoading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // useCallback so the function is recreated whenever any filter prop changes,
  // which then triggers the useEffect below — no stale closure possible.
  const fetchStatusData = useCallback(async () => {
    const monthIndex = MONTHS.indexOf(selectedMonth); // 0-based
    const yearNum = parseInt(selectedYear);

    if (monthIndex === -1) {
      console.error('Invalid month:', selectedMonth);
      setStatusData({ active: 0, inactive: 0, closed: 0 });
      return;
    }

    setLoading(true);
    try {
      // FIX: Build date strings from parts instead of using toISOString() on a
      // local Date object. new Date(year, month, 1).toISOString() in UTC+8 returns
      // the previous day's date (e.g. "2025-03-31" for April 1), causing the API
      // to receive the wrong date range and returning extra/wrong records.
      const dateFrom = toLocalDateString(yearNum, monthIndex, 1);
      const dateTo = toLocalDateString(yearNum, monthIndex, lastDayOfMonth(yearNum, monthIndex));

      // Pass undefined when 'All Provinces' so the API returns everything.
      // Uppercase to match how provinces are stored in the DB (e.g. 'BATANGAS')
      const province = selectedProvince === 'All Provinces' ? undefined : selectedProvince.toUpperCase();

      const data = await facilityVisitsService.getStatusCount(dateFrom, dateTo, province);

      setStatusData({
        active: data?.active ?? 0,
        inactive: data?.inactive ?? 0,
        closed: data?.closed ?? 0,
      });
    } catch (err) {
      console.error('Error fetching status count:', err);
      setStatusData({ active: 0, inactive: 0, closed: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedProvince, selectedMonth, selectedYear]);

  // Re-runs whenever the callback identity changes (i.e. any filter changed)
  // OR when refreshTrigger is bumped after a CRUD operation
  useEffect(() => {
    fetchStatusData();
  }, [fetchStatusData, refreshTrigger]);

  const total = statusData.active + statusData.inactive + statusData.closed;

  const getPercentage = (value: number) => {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  };

  const handleDownload = async (format: 'png' | 'svg' | 'excel') => {
    setShowDownloadMenu(false);
    try {
      if (format === 'excel') {
        const excelData = [
          { Province: selectedProvince, Status: 'Active',   Count: statusData.active,   Percentage: `${getPercentage(statusData.active)}%` },
          { Province: selectedProvince, Status: 'Inactive', Count: statusData.inactive, Percentage: `${getPercentage(statusData.inactive)}%` },
          { Province: selectedProvince, Status: 'Closed',   Count: statusData.closed,   Percentage: `${getPercentage(statusData.closed)}%` },
          { Province: selectedProvince, Status: 'TOTAL',    Count: total,               Percentage: '100%' },
        ];
        await downloadChart({
          elementId: 'facility-visits-chart',
          filename: `Facility_Visits_${selectedProvince.replace(' ', '_')}_${selectedMonth}_${selectedYear}`,
          format: 'excel',
          data: excelData,
          sheetName: 'Facility Visits',
        });
      } else {
        await downloadChart({
          elementId: 'facility-visits-chart',
          filename: `Facility_Visits_${selectedProvince.replace(' ', '_')}_${selectedMonth}_${selectedYear}`,
          format,
          backgroundColor: '#ffffff',
          scale: 2,
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const circleLength = 251.2;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors h-full flex flex-col">
      <div className="p-6 flex-1 flex flex-col">

        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Facilities Visits — {selectedMonth} {selectedYear}
            </h4>
            {selectedProvince !== 'All Provinces' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Province:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {selectedProvince}
                </span>
              </p>
            )}
          </div>

          {/* Download dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={total === 0 || loading}
              className="h-8 px-3 text-xs rounded-lg border
                bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
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
                <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border z-20 overflow-hidden
                  bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  {(['png', 'svg', 'excel'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleDownload(fmt)}
                      className="w-full px-4 py-2 text-left text-xs
                        hover:bg-gray-50 dark:hover:bg-gray-700
                        text-gray-700 dark:text-gray-300
                        transition-colors flex items-center gap-2"
                    >
                      <Download size={12} />
                      {fmt === 'excel' ? 'Export Data to Excel' : `Download as ${fmt.toUpperCase()}`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart area */}
        <div
          id="facility-visits-chart"
          className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[300px] p-6"
        >
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
          ) : total === 0 ? (
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">No data available for this period</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {selectedProvince} — {selectedMonth} {selectedYear}
              </p>
            </div>
          ) : (
            <div className="text-center w-full">
              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">

                {/* Active */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20"
                        strokeDasharray={`${(statusData.active / total) * circleLength} ${circleLength}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {statusData.active}
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-sm font-semibold text-green-700 dark:text-green-300">Active</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {getPercentage(statusData.active)}%
                    </div>
                  </div>
                </div>

                {/* Inactive */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" stroke="#eab308" strokeWidth="20"
                        strokeDasharray={`${(statusData.inactive / total) * circleLength} ${circleLength}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {statusData.inactive}
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Inactive</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {getPercentage(statusData.inactive)}%
                    </div>
                  </div>
                </div>

                {/* Closed */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" stroke="#6b7280" strokeWidth="20"
                        strokeDasharray={`${(statusData.closed / total) * circleLength} ${circleLength}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {statusData.closed}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Closed</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {getPercentage(statusData.closed)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Visits:{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Active ({statusData.active})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Inactive ({statusData.inactive})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Closed ({statusData.closed})</span>
          </div>
        </div>
      </div>

      {/* Footer dropdowns — call parent callbacks to lift state up to container */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 flex-wrap">
        <select
          value={selectedProvince}
          onChange={(e) => onProvinceChange(e.target.value)}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500"
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
};