// src/pages/pdo/NSFDatabase.tsx
import React, { useState, useMemo } from 'react';
import { NSFSummaryCards }    from './components/NSFSummaryCards';
import { NSFStatusChart }     from './components/NSFStatusChart';
import { NSFReactivateChart } from './components/NSFReactivateChart';
import { NSFTable }           from './components/NSFTable';
import type { NSFRecord }     from './components/NSFTable';

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 Replace with your real hooks when ready.
//    Shape expected: { data: NSFRecord[], isLoading: boolean, isError: boolean }
// ─────────────────────────────────────────────────────────────────────────────
// import { useNSFList, useNSFPreviousList } from '../../hooks/PDOHooks/useNSFList';

// ── Temporary stub so the page renders without errors ─────────────────────
const useNSFList = (_month: string, _year: string) => ({
  data:      [] as NSFRecord[],
  isLoading: false,
  isError:   false,
});
const useNSFPreviousList = (_month: string, _year: string) => ({
  data: [] as NSFRecord[],
});
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const NSFDatabase: React.FC = () => {
  const now = new Date();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [month,            setMonth]            = useState(MONTHS[now.getMonth()]);
  const [year,             setYear]             = useState(String(now.getFullYear()));
  const [selectedStatus,   setSelectedStatus]   = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: rawData = [], isLoading, isError } = useNSFList(month, year);

  // Previous period for delta cards
  const prevMonth = useMemo(() => {
    const idx = MONTHS.indexOf(month);
    return idx > 0 ? MONTHS[idx - 1] : MONTHS[11];
  }, [month]);
  const prevYear = useMemo(() => {
    return MONTHS.indexOf(month) === 0 ? String(Number(year) - 1) : year;
  }, [month, year]);

  const { data: prevData = [] } = useNSFPreviousList(prevMonth, prevYear);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredData: NSFRecord[] = useMemo(() => {
    let d = rawData;
    if (selectedStatus && selectedStatus !== 'all') {
      d = d.filter(r => (r.status ?? '').toLowerCase() === selectedStatus.toLowerCase());
    }
    if (selectedProvince && selectedProvince !== 'all') {
      d = d.filter(r => (r.province ?? '').toLowerCase() === selectedProvince.toLowerCase());
    }
    return d;
  }, [rawData, selectedStatus, selectedProvince]);

  // Unique provinces for dropdown
  const provinces = useMemo(() => {
    const set = new Set(rawData.map(r => r.province).filter((p): p is string => !!p));
    return Array.from(set).sort();
  }, [rawData]);

  // Labels
  const periodLabel = `${month} ${year}`;
  const filterLabel = [
    periodLabel,
    selectedStatus ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1) : 'All Status',
    selectedProvince !== 'all' ? selectedProvince : 'All Provinces',
  ].join(' · ');

  // Year options (current year ± 5)
  const yearOptions = Array.from({ length: 6 }, (_, i) =>
    String(now.getFullYear() - 2 + i)
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleView   = (record: NSFRecord) => console.log('View',   record);
  const handleEdit   = (record: NSFRecord) => console.log('Edit',   record);
  const handleDelete = (record: NSFRecord) => {
    if (window.confirm(`Delete facility "${record.facility_name}"?`)) {
      console.log('Delete', record);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          NSF Database
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Non-Service Facility records and status overview
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Month */}
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Year */}
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>

        {/* Province */}
        <select
          value={selectedProvince}
          onChange={e => setSelectedProvince(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Provinces</option>
          {provinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <NSFSummaryCards
        data={filteredData}
        isLoading={isLoading}
        periodLabel={periodLabel}
        previousData={prevData}
      />

      {/* Charts side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <NSFStatusChart
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          filterLabel={filterLabel}
        />
        <NSFReactivateChart
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          periodLabel={periodLabel}
          filterLabel={filterLabel}
        />
      </div>

      {/* Table */}
      <NSFTable
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        filterLabel={filterLabel}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};