import React from 'react';
import { useFollowupSummaryCards } from '../../../hooks/FollowupHooks/useFollowupSummaryCards';

export const FollowupStats: React.FC = () => {
    const {
        totalRecallPerMonth,
        totalRecallPerDay,
        totalPending,
        averageRecallTime,
    } = useFollowupSummaryCards();

    const stats = [
        {
            label: 'Total Recalled For this Month',
            value: totalRecallPerMonth.isLoading ? '...' : totalRecallPerMonth.value,
            sub: totalRecallPerMonth.sub,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            accent: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/30',
        },
        {
            label: 'Total Recalled Today',
            value: totalRecallPerDay.isLoading ? '...' : totalRecallPerDay.value,
            sub: totalRecallPerDay.sub,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            accent: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/30',
        },
        {
            label: 'Total Pending',
            value: totalPending.isLoading ? '...' : totalPending.value,
            sub: totalPending.sub,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            accent: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-900/30',
        },
        {
            label: 'Avg Recalled Time',
            value: averageRecallTime.isLoading ? '...' : averageRecallTime.value,
            sub: averageRecallTime.sub,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            accent: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-50 dark:bg-sky-900/30',
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
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <div className={`${stat.bg} ${stat.accent} p-2 rounded-lg`}>{stat.icon}</div>
                        </div>
                        <p className={`text-3xl font-bold tracking-tight ${stat.accent}`}>{stat.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};