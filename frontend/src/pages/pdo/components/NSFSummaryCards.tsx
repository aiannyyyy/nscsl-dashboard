// src/pages/PDO/components/NSFSummaryCards.tsx
import React from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NSFRecord {
  status?: string | null;
  [key: string]: any;
}

interface NSFSummaryCardsProps {
  data: NSFRecord[];
  isLoading?: boolean;
  /** Month label shown in sub-text, e.g. "May 2025" */
  periodLabel?: string;
  /** Data from the previous period for delta calculation */
  previousData?: NSFRecord[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function countByStatus(records: NSFRecord[], status: string) {
  return records.filter(
    (r) => (r.status ?? '').toLowerCase() === status.toLowerCase()
  ).length;
}

function delta(current: number, previous: number) {
  return current - previous;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFSummaryCards: React.FC<NSFSummaryCardsProps> = ({
  data = [],
  isLoading = false,
  periodLabel = 'this month',
  previousData = [],
}) => {
  const total    = data.length;
  const active   = countByStatus(data, 'active');
  const inactive = countByStatus(data, 'inactive');
  const closed   = countByStatus(data, 'closed');

  const prevTotal    = previousData.length;
  const prevActive   = countByStatus(previousData, 'active');
  const prevInactive = countByStatus(previousData, 'inactive');
  const prevClosed   = countByStatus(previousData, 'closed');

  const stats = [
    {
      label:   'Total Facilities',
      value:   total,
      prev:    prevTotal,
      icon:    <Building2 className="w-5 h-5" />,
      accent:  'text-blue-600 dark:text-blue-400',
      bg:      'bg-blue-50 dark:bg-blue-900/30',
      sub:     `All NSF records for ${periodLabel}`,
    },
    {
      label:   'Active',
      value:   active,
      prev:    prevActive,
      icon:    <CheckCircle2 className="w-5 h-5" />,
      accent:  'text-emerald-600 dark:text-emerald-400',
      bg:      'bg-emerald-50 dark:bg-emerald-900/30',
      sub:     `${total > 0 ? ((active / total) * 100).toFixed(1) : 0}% of total`,
    },
    {
      label:   'Inactive',
      value:   inactive,
      prev:    prevInactive,
      icon:    <AlertCircle className="w-5 h-5" />,
      accent:  'text-amber-600 dark:text-amber-400',
      bg:      'bg-amber-50 dark:bg-amber-900/30',
      sub:     `${total > 0 ? ((inactive / total) * 100).toFixed(1) : 0}% of total`,
    },
    {
      label:   'Closed',
      value:   closed,
      prev:    prevClosed,
      icon:    <XCircle className="w-5 h-5" />,
      accent:  'text-rose-600 dark:text-rose-400',
      bg:      'bg-rose-50 dark:bg-rose-900/30',
      sub:     `${total > 0 ? ((closed / total) * 100).toFixed(1) : 0}% of total`,
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const diff    = delta(stat.value, stat.prev);
          const hasPrev = previousData.length > 0;

          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {/* Icon + Label */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <div className={`${stat.bg} ${stat.accent} p-2 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>

              {/* Value */}
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
              ) : (
                <p className={`text-3xl font-bold tracking-tight ${stat.accent}`}>
                  {stat.value.toLocaleString()}
                </p>
              )}

              {/* Delta badge */}
              {hasPrev && !isLoading && (
                <div className="mt-2">
                  {diff === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      <Minus className="w-3 h-3" />
                      No change vs last month
                    </span>
                  ) : diff > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      <TrendingUp className="w-3 h-3" />
                      +{diff} compared to last month
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                      <TrendingDown className="w-3 h-3" />
                      {diff} compared to last month
                    </span>
                  )}
                </div>
              )}

              {/* Sub-text */}
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};