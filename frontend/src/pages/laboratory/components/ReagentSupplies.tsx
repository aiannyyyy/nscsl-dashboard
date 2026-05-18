import React, { useState } from 'react';
import {
  Search, FlaskConical, AlertTriangle,
  CheckCircle2, AlertCircle, XCircle, Download,
} from 'lucide-react';
import { useLabReagents } from '../../../hooks/LaboratoryHooks/useLabReagents';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import type { LabReagent, ReagentStatus } from '../../../services/LaboratoryServices/labReagentsService';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<ReagentStatus, {
  border: string;
  text: string;
  badge: string;
  badgeActive: string;
  bar: string;
  label: string;
  icon: React.ElementType;
}> = {
  normal: {
    border:      'border-emerald-400',
    text:        'text-emerald-600 dark:text-emerald-400',
    badge:       'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    badgeActive: 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400 dark:ring-emerald-600',
    bar:         'bg-emerald-400',
    label:       'In Stock',
    icon:        CheckCircle2,
  },
  warning: {
    border:      'border-amber-400',
    text:        'text-amber-600 dark:text-amber-400',
    badge:       'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    badgeActive: 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 ring-2 ring-amber-400 dark:ring-amber-600',
    bar:         'bg-amber-400',
    label:       'Low Stock',
    icon:        AlertTriangle,
  },
  critical: {
    border:      'border-red-400',
    text:        'text-red-600 dark:text-red-400',
    badge:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    badgeActive: 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200 ring-2 ring-red-400 dark:ring-red-600',
    bar:         'bg-red-400',
    label:       'Critical',
    icon:        AlertCircle,
  },
  'out-of-stock': {
    border:      'border-gray-400',
    text:        'text-gray-600 dark:text-gray-400',
    badge:       'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
    badgeActive: 'bg-gray-200 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 ring-2 ring-gray-400 dark:ring-gray-600',
    bar:         'bg-gray-400',
    label:       'Out of Stock',
    icon:        XCircle,
  },
};

// ─────────────────────────────────────────────
// Reagent Card
// ─────────────────────────────────────────────
const ReagentCard: React.FC<{ reagent: LabReagent; index: number }> = ({ reagent, index }) => {
  const cfg = STATUS_CONFIG[reagent.status];
  const StatusIcon = cfg.icon;

  // Use warning threshold as the "full" bar ceiling so the bar is meaningful
  const maxStock    = reagent.thresholds?.warning ?? 20;
  const stockPercent = Math.min((reagent.stock / maxStock) * 100, 100);

  return (
    <div
      className={`relative flex gap-3 px-4 py-3 rounded-xl border-l-4 ${cfg.border}
        bg-white dark:bg-gray-800/60
        border border-gray-100 dark:border-gray-700/50
        hover:shadow-md dark:hover:shadow-gray-900/30
        transition-all duration-200 hover:-translate-y-0.5 cursor-default`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <StatusIcon size={18} className={`${cfg.text} shrink-0 mt-0.5`} strokeWidth={2} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {reagent.description}
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        <div className="mt-1.5 w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.bar} transition-all duration-500`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>

        <div className="mt-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Code: <span className="font-medium text-gray-600 dark:text-gray-300">{reagent.itemCode}</span>
          </span>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end justify-start">
        <p className={`text-sm font-bold ${cfg.text}`}>{reagent.stock}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{reagent.unit}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Filter Pill
// ─────────────────────────────────────────────
const FilterPill: React.FC<{
  count:   number;
  status:  ReagentStatus;
  active:  boolean;
  onClick: () => void;
}> = ({ count, status, active, onClick }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
        transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95
        ${active ? cfg.badgeActive : cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
      {count} {cfg.label}
    </button>
  );
};

// ─────────────────────────────────────────────
// Export Dropdown
// ─────────────────────────────────────────────
const ExportDropdown: React.FC<{
  reagents:  LabReagent[];
  elementId: string;
}> = ({ reagents, elementId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (format: 'png' | 'svg' | 'excel') => {
    setIsOpen(false);
    try {
      if (format === 'excel') {
        const excelData = reagents.map(r => ({
          'Item Code':   r.itemCode,
          'Description': r.description,
          'Stock':       r.stock,
          'Unit':        r.unit,
          'Status':      r.status.toUpperCase(),
        }));
        await downloadChart({
          elementId,
          filename:  `reagent-supplies-${new Date().toISOString().split('T')[0]}`,
          format:    'excel',
          data:      excelData,
          sheetName: 'Reagent Supplies',
        });
      } else {
        await downloadChart({
          elementId,
          filename:         `reagent-supplies-${new Date().toISOString().split('T')[0]}`,
          format,
          backgroundColor:  '#ffffff',
          scale:            2,
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
          text-gray-600 dark:text-gray-300
          hover:text-blue-600 dark:hover:text-blue-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          rounded-lg transition-all"
      >
        <Download size={14} />
        Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            {(['png', 'svg', 'excel'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Download {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const CHART_ID = 'reagent-supplies-chart';

const STATUS_FILTERS: ReagentStatus[] = ['normal', 'out-of-stock', 'warning', 'critical'];

export const ReagentSupplies: React.FC = () => {
  const [searchTerm,   setSearchTerm]   = useState('');
  const [activeFilter, setActiveFilter] = useState<ReagentStatus | null>(null);

  const { data, isLoading, isError } = useLabReagents();
  const reagents = data?.data ?? [];

  const counts = STATUS_FILTERS.reduce<Record<ReagentStatus, number>>(
    (acc, s) => ({ ...acc, [s]: reagents.filter(r => r.status === s).length }),
    {} as Record<ReagentStatus, number>,
  );

  const filtered = reagents.filter(r => {
    const matchesStatus = activeFilter ? r.status === activeFilter : true;
    const term          = searchTerm.trim().toLowerCase();
    const matchesSearch = term === ''
      || r.description.toLowerCase().includes(term)
      || r.itemCode.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const toggleFilter = (status: ReagentStatus) =>
    setActiveFilter(prev => (prev === status ? null : status));

  return (
    <div id={CHART_ID} className="rounded-2xl shadow-lg overflow-hidden bg-white dark:bg-gray-900 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FlaskConical size={18} className="text-blue-500" />
          Reagent Supplies
        </h3>

        <div className="flex items-center gap-3">
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Clear filter
            </button>
          )}
          <ExportDropdown reagents={filtered} elementId={CHART_ID} />
        </div>
      </div>

      {/* Filter Pills + Search */}
      <div className="px-4 pt-3 pb-2 space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(status => (
            <FilterPill
              key={status}
              status={status}
              count={counts[status]}
              active={activeFilter === status}
              onClick={() => toggleFilter(status)}
            />
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reagent or code…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border
              border-gray-200 dark:border-gray-700
              bg-gray-50 dark:bg-gray-800
              text-gray-800 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-colors"
          />
        </div>
      </div>

      {/* Reagent List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2" style={{ maxHeight: '320px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading reagents...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-red-500 dark:text-red-400">Error loading reagents</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-400 dark:text-gray-500">No reagents found</p>
          </div>
        ) : (
          filtered.map((reagent, i) => (
            <ReagentCard key={reagent.itemCode} reagent={reagent} index={i} />
          ))
        )}
      </div>
    </div>
  );
};