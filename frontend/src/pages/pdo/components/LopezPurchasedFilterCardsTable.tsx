import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Download, ChevronDown, ChevronRight, Building2, CreditCard, Search, X } from 'lucide-react';
import {
  useNearbyLopezPurchasedFilterCards,
  useCalabarzOnPurchasedFilterCards,
} from '../../../hooks/PDOHooks/usePDOFilterCards';

// ─── Date helpers ──────────────────────────────────────────────────────────────

const currentDate  = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear  = currentDate.getFullYear();

const months = [
  { label: 'January',   value: 1  }, { label: 'February', value: 2  },
  { label: 'March',     value: 3  }, { label: 'April',    value: 4  },
  { label: 'May',       value: 5  }, { label: 'June',     value: 6  },
  { label: 'July',      value: 7  }, { label: 'August',   value: 8  },
  { label: 'September', value: 9  }, { label: 'October',  value: 10 },
  { label: 'November',  value: 11 }, { label: 'December', value: 12 },
];

const years = Array.from({ length: 16 }, (_, i) => currentYear - i);

const getLastDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const buildDateRange = (year: number, month: number) => {
  const lastDay = getLastDayOfMonth(year, month);
  return {
    date_from: `${year}-${String(month).padStart(2, '0')}-01`,
    date_to:   `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

// ─── Tab config ────────────────────────────────────────────────────────────────

const PROVINCE_TABS = [
  { key: 'CAVITE',   label: 'Cavite'   },
  { key: 'LAGUNA',   label: 'Laguna'   },
  { key: 'BATANGAS', label: 'Batangas' },
  { key: 'RIZAL',    label: 'Rizal'    },
  { key: 'QUEZON',   label: 'Quezon'   },
] as const;

type ProvinceKey  = typeof PROVINCE_TABS[number]['key'];
type TableVariant = ProvinceKey | 'NEARBY_LOPEZ';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BreakdownItem {
  submid:      string;
  descr1:      string;
  total_count: number;
}

interface RowData {
  city:        string;
  total_count: number;
  breakdown:   BreakdownItem[];
}

// ─── Search result type ────────────────────────────────────────────────────────

interface SearchMatch {
  tab:          TableVariant;
  tabLabel:     string;
  city:         string;
  facilityName: string;
  submid:       string;
}

// ─── Shared table ──────────────────────────────────────────────────────────────

interface FilterCardTableProps {
  data:              RowData[];
  isLoading:         boolean;
  expandedCities:    Set<string>;
  onToggleCity:      (city: string) => void;
  searchQuery:       string;
  highlightFacility: string | null;
}

const FilterCardTable: React.FC<FilterCardTableProps> = ({
  data,
  isLoading,
  expandedCities,
  onToggleCity,
  searchQuery,
  highlightFacility,
}) => {
  const totalCount   = data.reduce((sum, r) => sum + r.total_count, 0);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const query        = searchQuery.toLowerCase().trim();

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightFacility]);

  const filteredData = query
    ? data.filter(row =>
        row.city.toLowerCase().includes(query) ||
        row.breakdown.some(
          b => b.descr1.toLowerCase().includes(query) || b.submid.toLowerCase().includes(query)
        )
      )
    : data;

  const highlight = (text: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded px-0.5">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="max-h-[460px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <table className="w-full text-sm text-left table-fixed">
        <colgroup>
          <col className="w-8" />
          <col />
          <col className="w-20" />
          <col className="w-20" />
        </colgroup>
        <thead className="sticky top-0 bg-blue-600 dark:bg-blue-700 text-white uppercase text-xs z-10">
          <tr>
            <th className="px-3 py-3" />
            <th className="px-4 py-3">City / Facility</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              </td>
            </tr>
          ) : filteredData.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                {query ? `No facilities match "${searchQuery}".` : 'No data found.'}
              </td>
            </tr>
          ) : (
            <>
              {filteredData.map((row, index) => {
                const isExpanded      = expandedCities.has(row.city);
                const shouldAutoExpand = highlightFacility !== null &&
                  row.breakdown.some(b => b.submid === highlightFacility);

                return (
                  <React.Fragment key={index}>
                    <tr
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
                      onClick={() => onToggleCity(row.city)}
                    >
                      <td className="px-3 py-2.5 text-blue-500">
                        {(isExpanded || shouldAutoExpand)
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">
                        <span className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-blue-400 shrink-0" />
                          <span className="truncate">{highlight(row.city)}</span>
                          <span className="shrink-0 text-xs font-normal text-gray-400">
                            ({row.breakdown.length}{' '}
                            {row.breakdown.length !== 1 ? 'facilities' : 'facility'})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-gray-100">
                        {row.total_count.toLocaleString()}
                      </td>
                    </tr>

                    {(isExpanded || shouldAutoExpand) && row.breakdown.map((b, bIndex) => {
                      const isHighlighted = b.submid === highlightFacility;
                      return (
                        <tr
                          key={`${index}-${bIndex}`}
                          ref={isHighlighted ? highlightRef : undefined}
                          className={`border-t border-gray-100 dark:border-gray-700 transition-colors ${
                            isHighlighted
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-inset ring-yellow-300 dark:ring-yellow-600'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900'
                          }`}
                        >
                          <td className="px-3 py-2" />
                          <td className="px-4 py-2 pl-8 text-gray-600 dark:text-gray-300 text-xs">
                            <span className="text-gray-400 mr-1.5">└</span>
                            <span className="truncate">{highlight(b.descr1)}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {highlight(b.submid)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                            {b.total_count.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-semibold">
                <td className="px-3 py-2.5" />
                <td className="px-4 py-2.5 text-gray-800 dark:text-gray-100" colSpan={2}>TOTAL</td>
                <td className="px-4 py-2.5 text-right text-gray-800 dark:text-gray-100">
                  {totalCount.toLocaleString()}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const LopezPurchasedFilterCardsTable: React.FC = () => {
  const [selectedMonth,    setSelectedMonth]    = useState(currentMonth);
  const [selectedYear,     setSelectedYear]     = useState(currentYear);
  const [activeTab,        setActiveTab]        = useState<TableVariant>('CAVITE');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedCities,   setExpandedCities]   = useState<Set<string>>(new Set());

  // ── Search state ──
  const [searchQuery,       setSearchQuery]       = useState('');
  const [searchMatches,     setSearchMatches]     = useState<SearchMatch[]>([]);
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const [highlightFacility, setHighlightFacility] = useState<string | null>(null);
  const [searchFoundInTab,  setSearchFoundInTab]  = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { date_from, date_to } = buildDateRange(selectedYear, selectedMonth);

  const searching = searchQuery.trim().length > 0;

  // ── Queries ───────────────────────────────────────────────────────────────────
  // calabarzonQuery is always enabled when searching (to allow cross-tab search)
  // or when on any province tab.
  const calabarzonQuery = useCalabarzOnPurchasedFilterCards(
    { date_from, date_to },
    activeTab !== 'NEARBY_LOPEZ' || searching
  );

  // nearbyLopezQuery is enabled when on its tab OR when searching.
  const nearbyLopezQuery = useNearbyLopezPurchasedFilterCards(
    { date_from, date_to },
    activeTab === 'NEARBY_LOPEZ' || searching
  );

  // ── Close suggestions on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derive active data ────────────────────────────────────────────────────────

  const activeData: RowData[] = (() => {
    if (activeTab === 'NEARBY_LOPEZ') {
      return nearbyLopezQuery.data?.data ?? [];
    }
    const county = calabarzonQuery.data?.data.find(c => c.county === activeTab);
    return county?.cities.map(city => ({
      city:        city.city,
      total_count: city.total_count,
      breakdown:   city.breakdown,
    })) ?? [];
  })();

  const isLoading = activeTab === 'NEARBY_LOPEZ'
    ? nearbyLopezQuery.isLoading || nearbyLopezQuery.isFetching
    : calabarzonQuery.isLoading;

  const pageTitle = activeTab === 'NEARBY_LOPEZ'
    ? 'Nearby Lopez Purchased Filter Cards'
    : `${PROVINCE_TABS.find(t => t.key === activeTab)?.label} Purchased Filter Cards`;

  // ── Build cross-tab search matches ──
  const buildMatches = useCallback((query: string): SearchMatch[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchMatch[] = [];

    // Search across all CALABARZON provinces
    const calabarzonData = calabarzonQuery.data?.data ?? [];
    for (const county of calabarzonData) {
      const tabConfig = PROVINCE_TABS.find(t => t.key === county.county);
      if (!tabConfig) continue;
      for (const city of county.cities) {
        for (const b of city.breakdown) {
          if (
            b.descr1.toLowerCase().includes(q) ||
            b.submid.toLowerCase().includes(q) ||
            city.city.toLowerCase().includes(q)
          ) {
            results.push({
              tab:          tabConfig.key as TableVariant,
              tabLabel:     tabConfig.label,
              city:         city.city,
              facilityName: b.descr1,
              submid:       b.submid,
            });
          }
        }
      }
    }

    // Search Nearby Lopez
    const lopezData = nearbyLopezQuery.data?.data ?? [];
    for (const row of lopezData) {
      for (const b of row.breakdown) {
        if (
          b.descr1.toLowerCase().includes(q) ||
          b.submid.toLowerCase().includes(q) ||
          row.city.toLowerCase().includes(q)
        ) {
          results.push({
            tab:          'NEARBY_LOPEZ',
            tabLabel:     'Nearby Lopez',
            city:         row.city,
            facilityName: b.descr1,
            submid:       b.submid,
          });
        }
      }
    }

    return results;
  }, [calabarzonQuery.data, nearbyLopezQuery.data]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setHighlightFacility(null);
    setSearchFoundInTab(null);
    if (value.trim()) {
      const matches = buildMatches(value);
      setSearchMatches(matches);
      setShowSuggestions(true);
    } else {
      setSearchMatches([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectMatch = (match: SearchMatch) => {
    setShowSuggestions(false);
    setSearchQuery(match.facilityName);
    setHighlightFacility(match.submid);

    if (match.tab !== activeTab) {
      setSearchFoundInTab(match.tabLabel);
      setActiveTab(match.tab);
      setExpandedCities(new Set([match.city]));
    } else {
      setSearchFoundInTab(null);
      setExpandedCities(prev => {
        const next = new Set(prev);
        next.add(match.city);
        return next;
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMatches([]);
    setShowSuggestions(false);
    setHighlightFacility(null);
    setSearchFoundInTab(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const toggleCity  = (city: string) =>
    setExpandedCities(prev => {
      const next = new Set(prev);
      next.has(city) ? next.delete(city) : next.add(city);
      return next;
    });

  const expandAll   = () => setExpandedCities(new Set(activeData.map(d => d.city)));
  const collapseAll = () => setExpandedCities(new Set());

  const handleTabChange = (tab: TableVariant) => {
    setActiveTab(tab);
    setExpandedCities(new Set());
    setHighlightFacility(null);
    setSearchFoundInTab(null);
  };

  // ── Badge helpers ─────────────────────────────────────────────────────────────

  const getProvinceCount = (key: ProvinceKey) =>
    calabarzonQuery.data?.data.find(c => c.county === key)?.total_count;

  const nearbyLopezTotalCount = nearbyLopezQuery.data?.data
    .reduce((sum, r) => sum + r.total_count, 0);

  // ── Export ────────────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    setShowDownloadMenu(false);
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;
    const tabLabel   = activeTab === 'NEARBY_LOPEZ'
      ? 'NearbyLopez'
      : PROVINCE_TABS.find(t => t.key === activeTab)?.label ?? activeTab;
    const headers = ['City', 'Count', 'SUBMID', 'Description', 'Facility Count'];
    const rows: (string | number)[][] = [];
    activeData.forEach(row => {
      rows.push([row.city, row.total_count, '', '', '']);
      row.breakdown.forEach(b => rows.push(['', '', b.submid, b.descr1, b.total_count]));
    });
    const total = activeData.reduce((sum, r) => sum + r.total_count, 0);
    rows.push(['TOTAL', total, '', '', '']);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `FilterCards_${tabLabel}_${monthLabel}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    setShowDownloadMenu(false);
    const element = document.getElementById('calabarzon-filter-cards-table');
    if (!element) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(element, { backgroundColor: '#ffffff', scale: 2 }).then(canvas => {
        const link    = document.createElement('a');
        link.download = `FilterCards_${activeTab}_${selectedMonth}_${selectedYear}.png`;
        link.href     = canvas.toDataURL('image/png');
        link.click();
      });
    });
  };

  // ── Group matches by tab for dropdown ────────────────────────────────────────

  const matchesByTab = searchMatches.reduce<Record<string, SearchMatch[]>>((acc, m) => {
    const key = m.tabLabel;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col rounded-2xl shadow-lg overflow-hidden bg-white dark:bg-gray-900 transition-all duration-300">

      {/* ── Header row 1: title + date selects ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 shrink-0">
          <CreditCard size={18} className="text-blue-500 shrink-0" />
          {pageTitle}
        </h3>

        <div className="flex items-center gap-2">
          <select
            className="h-8 px-3 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select
            className="h-8 px-3 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Header row 2: search + actions ── */}
      <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">

        {/* Search box */}
        <div ref={searchRef} className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search facility name…"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            className="w-full h-7 pl-7 pr-7 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && searchQuery.trim() && (
            <div className="absolute left-0 top-full mt-1 w-80 max-h-64 overflow-y-auto rounded-lg shadow-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-30">
              {searchMatches.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">
                  No facilities found across all tabs.
                </div>
              ) : (
                Object.entries(matchesByTab).map(([tabLabel, matches]) => (
                  <div key={tabLabel}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500 bg-blue-50 dark:bg-blue-900/20 sticky top-0">
                      {tabLabel} · {matches.length} result{matches.length !== 1 ? 's' : ''}
                    </div>
                    {matches.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectMatch(m)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 first:border-0"
                      >
                        <div className="text-xs text-gray-800 dark:text-gray-100 truncate font-medium">
                          {m.facilityName}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <span className="font-mono">{m.submid}</span>
                          <span>·</span>
                          <span>{m.city}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tab-switched notice */}
        {searchFoundInTab && (
          <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md shrink-0">
            Switched to <strong>{searchFoundInTab}</strong>
          </span>
        )}

        {activeData.length > 0 && !isLoading && (
          <>
            <button
              onClick={expandAll}
              className="h-7 px-3 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="h-7 px-3 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Collapse
            </button>
          </>
        )}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isLoading || activeData.length === 0}
            className="h-7 px-3 text-xs rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            Export
            <ChevronDown size={11} />
          </button>
          {showDownloadMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
              <div className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                >
                  <Download size={12} /> Download as PNG
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                >
                  <Download size={12} /> Export Data to CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-x-auto">

        {/* Province tabs */}
        {PROVINCE_TABS.map(tab => {
          const count      = getProvinceCount(tab.key);
          const isActive   = activeTab === tab.key;
          const isSpinning = calabarzonQuery.isLoading && isActive;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {count !== undefined ? (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px]">
                  {count.toLocaleString()}
                </span>
              ) : isSpinning ? (
                <span className="ml-1.5 inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin align-middle" />
              ) : null}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px bg-gray-200 dark:bg-gray-700 my-1.5 mx-1 shrink-0" />

        {/* Nearby Lopez tab */}
        <button
          onClick={() => handleTabChange('NEARBY_LOPEZ')}
          className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'NEARBY_LOPEZ'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Nearby Lopez
          {nearbyLopezTotalCount !== undefined ? (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px]">
              {nearbyLopezTotalCount.toLocaleString()}
            </span>
          ) : nearbyLopezQuery.isLoading || nearbyLopezQuery.isFetching ? (
            <span className="ml-1.5 inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin align-middle" />
          ) : null}
        </button>
      </div>

      {/* ── Table ── */}
      <div id="calabarzon-filter-cards-table" className="p-4">
        <FilterCardTable
          data={activeData}
          isLoading={isLoading}
          expandedCities={expandedCities}
          onToggleCity={toggleCity}
          searchQuery={searchQuery}
          highlightFacility={highlightFacility}
        />
      </div>
    </div>
  );
};