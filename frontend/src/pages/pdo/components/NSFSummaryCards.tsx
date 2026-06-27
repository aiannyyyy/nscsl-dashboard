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
import { useNSFSummaryCards, useNSFSummaryTrend } from '../../../hooks/PDOHooks/useNSFFacilities';

// ── BEFORE ────────────────────────────────────────────────────────────────────
// export const NSFSummaryCards: React.FC = () => {
//   const { data: current,  isLoading: curLoading  } = useNSFSummaryCards();
//   const { data: thisTrend, isLoading: thisLoading } = useNSFSummaryTrend({ month: curMonth,  year: curYear  });
//   const { data: lastTrend, isLoading: prevLoading } = useNSFSummaryTrend({ month: prevMonth, year: prevYear });
// ─────────────────────────────────────────────────────────────────────────────

// ── AFTER ─────────────────────────────────────────────────────────────────────
// 1. Added NSFSummaryCardsProps interface with optional province
// 2. Component accepts province prop
// 3. province forwarded to all 3 hook calls so cards + trend deltas
//    all reflect the selected province (or all provinces if undefined)
// 4. FIX: cur/thisMo/lastMo now spread over a complete default object
//    instead of using `current ?? {...}`. This guards against the case
//    where the hook resolves to an object that exists but is missing
//    one or more keys (e.g. mock data returning `totalFacilities`
//    instead of `total`, or a province with partial fields) — `??`
//    only catches a fully undefined/null value, not missing keys.
// ─────────────────────────────────────────────────────────────────────────────

interface NSFSummaryCardsProps {
  province?: string;
}

interface NSFCardTotals {
  total: number;
  active: number;
  inactive: number;
  closed: number;
  partner: number;
}

const EMPTY_TOTALS: NSFCardTotals = {
  total: 0,
  active: 0,
  inactive: 0,
  closed: 0,
  partner: 0,
};

export const NSFSummaryCards: React.FC<NSFSummaryCardsProps> = ({ province }) => {
  const now = new Date();

  const curMonth  = String(now.getMonth() + 1);
  const curYear   = String(now.getFullYear());

  const prevDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = String(prevDate.getMonth() + 1);
  const prevYear  = String(prevDate.getFullYear());

  // All-time totals — big displayed numbers
  const { data: current, isLoading: curLoading } = useNSFSummaryCards({ province });

  // Trend — from reactivation_logs, this month vs last month
  const { data: thisTrend, isLoading: thisLoading } = useNSFSummaryTrend({ month: curMonth,  year: curYear,  province });
  const { data: lastTrend, isLoading: prevLoading } = useNSFSummaryTrend({ month: prevMonth, year: prevYear, province });

  // FIX: spread over full defaults so any individual missing key
  // (not just a fully undefined object) still falls back to 0.
  const cur    = { ...EMPTY_TOTALS, ...current };
  const thisMo = { ...EMPTY_TOTALS, ...thisTrend };
  const lastMo = { ...EMPTY_TOTALS, ...lastTrend };

  const isLoading = curLoading;
  const hasPrev   = !prevLoading && !thisLoading && !!lastTrend && !!thisTrend;

  const stats = [
    {
      label:  'Total Facilities',
      value:  cur.total,
      diff:   thisMo.total - lastMo.total,
      icon:   <Building2 className="w-5 h-5" />,
      accent: 'text-blue-600 dark:text-blue-400',
      bg:     'bg-blue-50 dark:bg-blue-900/30',
      sub:    'All NSF records',
    },
    {
      label:  'Active',
      value:  cur.active,
      diff:   thisMo.active - lastMo.active,
      icon:   <CheckCircle2 className="w-5 h-5" />,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg:     'bg-emerald-50 dark:bg-emerald-900/30',
      sub:    `${cur.total > 0 ? ((cur.active / cur.total) * 100).toFixed(1) : 0}% of total`,
    },
    {
      label:  'Inactive',
      value:  cur.inactive,
      diff:   thisMo.inactive - lastMo.inactive,
      icon:   <AlertCircle className="w-5 h-5" />,
      accent: 'text-amber-600 dark:text-amber-400',
      bg:     'bg-amber-50 dark:bg-amber-900/30',
      sub:    `${cur.total > 0 ? ((cur.inactive / cur.total) * 100).toFixed(1) : 0}% of total`,
    },
    {
      label:  'Closed',
      value:  cur.closed,
      diff:   thisMo.closed - lastMo.closed,
      icon:   <XCircle className="w-5 h-5" />,
      accent: 'text-rose-600 dark:text-rose-400',
      bg:     'bg-rose-50 dark:bg-rose-900/30',
      sub:    `${cur.total > 0 ? ((cur.closed / cur.total) * 100).toFixed(1) : 0}% of total`,
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
                {stat.diff === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    <Minus className="w-3 h-3" /> No change vs last month
                  </span>
                ) : stat.diff > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    <TrendingUp className="w-3 h-3" /> +{stat.diff} vs last month
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                    <TrendingDown className="w-3 h-3" /> {stat.diff} vs last month
                  </span>
                )}
              </div>
            )}

            {/* Sub-text */}
            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
};