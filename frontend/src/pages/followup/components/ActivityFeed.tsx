import React from 'react';

interface Activity {
  id: number;
  nurse: string;
  avatar: string;
  action: string;
  patient: string;
  time: string;
  type: 'complete' | 'assign' | 'overdue' | 'note';
}

const activities: Activity[] = [
  { id: 1, nurse: 'Aiko Tanaka', avatar: 'AT', action: 'completed follow-up for', patient: 'Pia Nguyen', time: '2 min ago', type: 'complete' },
  { id: 2, nurse: 'Sarah Mitchell', avatar: 'SM', action: 'assigned new task to', patient: 'David Osei', time: '8 min ago', type: 'assign' },
  { id: 3, nurse: 'James Rivera', avatar: 'JR', action: 'flagged overdue for', patient: 'Eleanor Voss', time: '15 min ago', type: 'overdue' },
  { id: 4, nurse: 'Omar Hassan', avatar: 'OH', action: 'added a note for', patient: 'Harry Bloom', time: '22 min ago', type: 'note' },
  { id: 5, nurse: 'Aiko Tanaka', avatar: 'AT', action: 'completed follow-up for', patient: 'Leo Park', time: '31 min ago', type: 'complete' },
  { id: 6, nurse: 'Sarah Mitchell', avatar: 'SM', action: 'completed follow-up for', patient: 'Nina Wells', time: '45 min ago', type: 'complete' },
];

const typeIcon: Record<Activity['type'], { icon: string; bg: string; text: string }> = {
  complete: { icon: '✓', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
  assign: { icon: '+', bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-600 dark:text-sky-400' },
  overdue: { icon: '!', bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-600 dark:text-rose-400' },
  note: { icon: '✎', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
};

const avatarColors: Record<string, string> = {
  AT: 'from-teal-500 to-cyan-600',
  SM: 'from-violet-500 to-purple-600',
  JR: 'from-sky-500 to-blue-600',
  OH: 'from-rose-500 to-pink-600',
};

export const ActivityFeed: React.FC = () => {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700/60">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
          Activity Feed
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Live team updates</p>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
        {activities.map((act) => {
          const icon = typeIcon[act.type];
          return (
            <div key={act.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColors[act.avatar] ?? 'from-slate-400 to-slate-500'} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}
              >
                {act.avatar}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{act.nurse}</span>
                  {' '}{act.action}{' '}
                  <span className="font-medium text-violet-600 dark:text-violet-400">{act.patient}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
              </div>

              {/* Type badge */}
              <div className={`w-6 h-6 rounded-full ${icon.bg} ${icon.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                {icon.icon}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-700/60">
        <button className="w-full text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline">
          View all activity →
        </button>
      </div>
    </section>
  );
};