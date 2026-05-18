import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, ChevronDown, Activity } from 'lucide-react';
import { useCurrentMonthSummary } from '../../../hooks/LaboratoryHooks';
import type { BreakdownData } from '../../../services/LaboratoryServices/cardSummary';

// ─────────────────────────────────────────────
// Breakdown config
// ─────────────────────────────────────────────
interface BreakdownItem {
  key:       keyof BreakdownData;
  label:     string;
  border:    string;
  badge:     string;
  badgeText: string;
  dot:       string;
}

const BREAKDOWN_ITEMS: BreakdownItem[] = [
  { key: 'initial',        label: 'Initial',         border: 'border-blue-400',   badge: 'bg-blue-50',   badgeText: 'text-blue-700',   dot: 'bg-blue-400'   },
  { key: 'repeatUnsat',    label: 'Repeat Unsat',    border: 'border-red-400',    badge: 'bg-red-50',    badgeText: 'text-red-700',    dot: 'bg-red-400'    },
  { key: 'repeatAbnormal', label: 'Repeat Abnormal', border: 'border-amber-400',  badge: 'bg-amber-50',  badgeText: 'text-amber-700',  dot: 'bg-amber-400'  },
  { key: 'repeatNormal',   label: 'Repeat Normal',   border: 'border-green-400',  badge: 'bg-green-50',  badgeText: 'text-green-700',  dot: 'bg-green-400'  },
  { key: 'monitoring',     label: 'Monitoring',      border: 'border-purple-400', badge: 'bg-purple-50', badgeText: 'text-purple-700', dot: 'bg-purple-400' },
  { key: 'unfit',          label: 'Unfit',           border: 'border-rose-400',   badge: 'bg-rose-50',   badgeText: 'text-rose-700',   dot: 'bg-rose-400'   },
];

// ─────────────────────────────────────────────
// Stat Row — horizontal strip, compact for half-width
// ─────────────────────────────────────────────
interface StatRowProps {
  title:      string;
  value:      number;
  icon:       React.ElementType;
  iconBg:     string;
  iconColor:  string;
  valueColor: string;
  isLoading:  boolean;
  hasError:   boolean;
}

const StatRow: React.FC<StatRowProps> = ({
  title, value, icon: Icon, iconBg, iconColor, valueColor,
  isLoading, hasError,
}) => (
  <div className="flex items-center justify-between px-5 py-3">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={17} className={iconColor} strokeWidth={2} />
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
    <p className={`text-2xl font-bold leading-tight tracking-tight ${valueColor}`}>
      {isLoading ? (
        <span className="inline-block w-14 h-7 bg-gray-100 rounded animate-pulse" />
      ) : hasError ? (
        <span className="text-gray-300">—</span>
      ) : (
        value.toLocaleString()
      )}
    </p>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export const SummaryCards: React.FC = () => {
  const { data: response, isLoading, error } = useCurrentMonthSummary();
  const [expanded, setExpanded] = useState(false);

  const data = response?.data ?? {
    received:  0,
    screened:  0,
    unsat:     0,
    breakdown: {
      initial:        0,
      repeatUnsat:    0,
      repeatAbnormal: 0,
      repeatNormal:   0,
      monitoring:     0,
      unfit:          0,
    },
  };

  const stats: Omit<StatRowProps, 'isLoading' | 'hasError'>[] = [
    {
      title:      'Total Received',
      value:      data.received,
      icon:       FileText,
      iconBg:     'bg-blue-50',
      iconColor:  'text-blue-600',
      valueColor: 'text-blue-700',
    },
    {
      title:      'Total Screened',
      value:      data.screened,
      icon:       CheckCircle,
      iconBg:     'bg-green-50',
      iconColor:  'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      title:      'Unsatisfactory',
      value:      data.unsat,
      icon:       AlertCircle,
      iconBg:     'bg-red-50',
      iconColor:  'text-red-500',
      valueColor: 'text-red-600',
    },
  ];

  const showValue = (v: number) =>
    isLoading || !!error ? '—' : v.toLocaleString();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              Laboratory Summary
            </h4>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
              {isLoading
                ? 'Loading data...'
                : error
                ? 'Error loading data'
                : 'Current month statistics'}
            </p>
          </div>
        </div>

        {!isLoading && !error && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Stat rows — vertical stack, fits half-width well */}
      <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-800 flex-1">
        {stats.map((stat, i) => (
          <StatRow
            key={i}
            {...stat}
            isLoading={isLoading}
            hasError={!!error}
          />
        ))}
      </div>

      {/* Breakdown toggle */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-2.5
                     hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 focus:outline-none"
          aria-expanded={expanded}
          aria-label="Toggle sample type breakdown"
        >
          <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-400">
            Sample Type Breakdown
          </span>
          <ChevronDown
            size={13}
            className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        {/* Breakdown panel */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: expanded ? '300px' : '0px' }}
        >
          <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-1.5">
            {BREAKDOWN_ITEMS.map(item => (
              <div
                key={item.key}
                className={`flex items-center justify-between gap-2
                            rounded-lg border-l-[3px] bg-gray-50 dark:bg-gray-800/60 px-3 py-2
                            ${item.border}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                    {item.label}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.badge} ${item.badgeText}`}>
                  {showValue(data.breakdown[item.key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-4 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <p className="text-xs text-red-600 font-medium">
            {error instanceof Error ? error.message : 'Failed to load summary data'}
          </p>
        </div>
      )}
    </div>
  );
};