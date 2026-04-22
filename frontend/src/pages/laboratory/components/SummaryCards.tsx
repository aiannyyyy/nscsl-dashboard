import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, ChevronDown, Activity } from 'lucide-react';
import { useCurrentMonthSummary } from '../../../hooks/LaboratoryHooks';
import type { BreakdownData } from '../../../services/LaboratoryServices/cardSummary';

// ─────────────────────────────────────────────
// Breakdown config
// ─────────────────────────────────────────────
interface BreakdownItem {
    key:        keyof BreakdownData;
    label:      string;
    border:     string;
    badge:      string;
    badgeText:  string;
    dot:        string;
}

const BREAKDOWN_ITEMS: BreakdownItem[] = [
    { key: 'initial',        label: 'Initial',         border: 'border-blue-500',   badge: 'bg-blue-50',   badgeText: 'text-blue-700',   dot: 'bg-blue-500'   },
    { key: 'repeatUnsat',    label: 'Repeat Unsat',    border: 'border-red-500',    badge: 'bg-red-50',    badgeText: 'text-red-700',    dot: 'bg-red-500'    },
    { key: 'repeatAbnormal', label: 'Repeat Abnormal', border: 'border-amber-500',  badge: 'bg-amber-50',  badgeText: 'text-amber-700',  dot: 'bg-amber-500'  },
    { key: 'repeatNormal',   label: 'Repeat Normal',   border: 'border-green-500',  badge: 'bg-green-50',  badgeText: 'text-green-700',  dot: 'bg-green-500'  },
    { key: 'monitoring',     label: 'Monitoring',      border: 'border-purple-500', badge: 'bg-purple-50', badgeText: 'text-purple-700', dot: 'bg-purple-500' },
    { key: 'unfit',          label: 'Unfit',           border: 'border-rose-500',   badge: 'bg-rose-50',   badgeText: 'text-rose-700',   dot: 'bg-rose-500'   },
];

// ─────────────────────────────────────────────
// Stat Card sub-component
// ─────────────────────────────────────────────
interface StatCardProps {
    title:      string;
    value:      number;
    icon:       React.ElementType;
    iconBg:     string;
    iconColor:  string;
    valueColor: string;
    isLoading:  boolean;
    hasError:   boolean;
    divider:    boolean;
}

const StatCard: React.FC<StatCardProps> = ({
    title, value, icon: Icon, iconBg, iconColor, valueColor,
    isLoading, hasError, divider,
}) => (
    <>
        <div className="flex-1 flex items-center gap-3 px-5 py-1">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon size={20} className={iconColor} strokeWidth={2} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
                <p className={`text-2xl font-bold leading-tight tracking-tight ${valueColor}`}>
                    {isLoading ? (
                        <span className="inline-block w-12 h-7 bg-gray-100 rounded animate-pulse" />
                    ) : hasError ? (
                        <span className="text-gray-300">—</span>
                    ) : (
                        value.toLocaleString()
                    )}
                </p>
            </div>
        </div>
        {divider && <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />}
    </>
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

    const stats: Omit<StatCardProps, 'isLoading' | 'hasError'>[] = [
        {
            title:      'Total Received',
            value:      data.received,
            icon:       FileText,
            iconBg:     'bg-blue-50',
            iconColor:  'text-blue-600',
            valueColor: 'text-blue-700',
            divider:    true,
        },
        {
            title:      'Total Screened',
            value:      data.screened,
            icon:       CheckCircle,
            iconBg:     'bg-green-50',
            iconColor:  'text-green-600',
            valueColor: 'text-green-700',
            divider:    true,
        },
        {
            title:      'Unsatisfactory',
            value:      data.unsat,
            icon:       AlertCircle,
            iconBg:     'bg-red-50',
            iconColor:  'text-red-500',
            valueColor: 'text-red-600',
            divider:    false,
        },
    ];

    const showValue = (v: number) =>
        isLoading || !!error ? '—' : v.toLocaleString();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                        <Activity size={15} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 leading-tight">
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

                {/* Live pulse indicator */}
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

            {/* ── Stats row ── */}
            <div className="flex items-stretch py-4">
                {stats.map((stat, i) => (
                    <StatCard
                        key={i}
                        {...stat}
                        isLoading={isLoading}
                        hasError={!!error}
                    />
                ))}
            </div>

            {/* ── Breakdown toggle footer ── */}
            <div className="border-t border-gray-50">
                <button
                    onClick={() => setExpanded(prev => !prev)}
                    className="w-full flex items-center justify-between px-6 py-3
                               hover:bg-gray-50 transition-colors duration-150 focus:outline-none"
                    aria-expanded={expanded}
                    aria-label="Toggle sample type breakdown"
                >
                    <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-400">
                        Sample Type Breakdown
                    </span>
                    <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : 'rotate-0'}`}
                    />
                </button>

                {/* ── Breakdown panel ── */}
                <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: expanded ? '300px' : '0px' }}
                >
                    <div className="px-6 pb-5 pt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {BREAKDOWN_ITEMS.map(item => (
                            <div
                                key={item.key}
                                className={`flex items-center justify-between gap-2
                                            rounded-xl border-l-[3px] bg-gray-50 px-3 py-2.5
                                            ${item.border}`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
                                    <span className="text-xs font-medium text-gray-600 truncate">
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

            {/* ── Error banner ── */}
            {error && (
                <div className="mx-6 mb-4 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-red-600 font-medium">
                        {error instanceof Error ? error.message : 'Failed to load summary data'}
                    </p>
                </div>
            )}
        </div>
    );
};