import React, { useState } from 'react';
import { Activity, CheckCircle2, CalendarCheck } from 'lucide-react';
import { useFollowupSummaryCards } from '../../../hooks/FollowupHooks/useFollowupSummaryCards';

const avatarColors = [
    'from-violet-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-rose-500 to-pink-600',
    'from-teal-500 to-cyan-600',
];

const NURSES = [
    { name: 'Mia Carla Garcia',    role: 'Follow Up Nurse I',   avatar: 'MG', assignedTest: 'METAB' },
    { name: 'Vivien Marie Wagan',  role: 'Follow Up Nurse II',  avatar: 'VM', assignedTest: 'HEMOG' },
    { name: 'Gretel Yedra',        role: 'Follow Up Nurse III', avatar: 'GY', assignedTest: 'ENDO'  },
    { name: 'Milyne Macayanan',    role: 'Follow Up Nurse IV',  avatar: 'MM', assignedTest: 'G6PD'  },
];

export const NurseCards: React.FC = () => {
    const [hovered, setHovered] = useState<number | null>(null);
    const { nurseRecallStats } = useFollowupSummaryCards();

    // Merge hardcoded nurses with DB results — default to 0 if no match
    const nurses = NURSES.map((nurse) => {
        const match = nurseRecallStats.data.find(
            (n) => n.nurse_name.trim().toLowerCase() === nurse.name.trim().toLowerCase()
        );
        return {
            ...nurse,
            total_recalled_month: match?.total_recalled_month ?? 0,
            total_recalled_today: match?.total_recalled_today ?? 0,
        };
    });

    if (nurseRecallStats.isLoading) {
        return (
            <section>
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                        Follow Up Nurses
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Recall activity overview</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 h-48 animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section>
            <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                    Follow Up Nurses
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Recall activity overview</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {nurses.map((nurse, i) => {
                    const isHovered = hovered === i;
                    const monthTotal = nurse.total_recalled_month || 1;
                    const progressPct = Math.round((nurse.total_recalled_today / monthTotal) * 100);

                    return (
                        <div
                            key={nurse.name}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            className={`relative bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-col gap-4 transition-all duration-200 ${
                                isHovered
                                    ? 'border-indigo-300 dark:border-indigo-700 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20 -translate-y-0.5'
                                    : 'border-gray-200 dark:border-gray-800 shadow-sm'
                            }`}
                        >
                            {/* Top row: avatar + assigned test badge */}
                            <div className="flex items-start justify-between">
                                <div
                                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColors[i]} flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0`}
                                >
                                    {nurse.avatar}
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                                    {nurse.assignedTest}
                                </span>
                            </div>

                            {/* Name & role */}
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                    {nurse.name}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{nurse.role}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                                        <span className="text-[10px] text-slate-400 leading-tight">This Month</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                        {nurse.total_recalled_month}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span className="text-[10px] text-slate-400 leading-tight">Today</span>
                                    </div>
                                    <p className="text-lg font-bold text-emerald-500 tabular-nums">
                                        {nurse.total_recalled_today}
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                                    <div className="flex items-center gap-1">
                                        <Activity className="w-2.5 h-2.5" />
                                        <span>Today vs. Month</span>
                                    </div>
                                    <span className="tabular-nums font-medium">{progressPct}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${avatarColors[i]}`}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};