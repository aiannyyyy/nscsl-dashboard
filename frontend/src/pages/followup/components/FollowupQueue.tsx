import React, { useState } from 'react';

type Priority = 'high' | 'medium' | 'low';
type Status = 'pending' | 'in-progress' | 'done';

interface Task {
  id: string;
  patient: string;
  ward: string;
  nurse: string;
  priority: Priority;
  status: Status;
  due: string;
  type: string;
}

const tasks: Task[] = [
  { id: 'FU-081', patient: 'Eleanor Voss', ward: 'Cardiology', nurse: 'James Rivera', priority: 'high', status: 'pending', due: '10:30 AM', type: 'Post-op Check' },
  { id: 'FU-082', patient: 'Marcus Lenn', ward: 'Oncology', nurse: 'Omar Hassan', priority: 'high', status: 'in-progress', due: '11:00 AM', type: 'Medication Review' },
  { id: 'FU-083', patient: 'Pia Nguyen', ward: 'Pediatrics', nurse: 'Aiko Tanaka', priority: 'medium', status: 'done', due: '09:15 AM', type: 'Vitals Check' },
  { id: 'FU-084', patient: 'David Osei', ward: 'General', nurse: 'Sarah Mitchell', priority: 'low', status: 'pending', due: '01:00 PM', type: 'Discharge Review' },
  { id: 'FU-085', patient: 'Luna Castillo', ward: 'Cardiology', nurse: 'James Rivera', priority: 'medium', status: 'pending', due: '12:30 PM', type: 'Lab Results' },
  { id: 'FU-086', patient: 'Harry Bloom', ward: 'Oncology', nurse: 'Omar Hassan', priority: 'high', status: 'in-progress', due: '10:00 AM', type: 'Pain Assessment' },
];

const priorityConfig: Record<Priority, string> = {
  high: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
};

const statusConfig: Record<Status, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' },
  'in-progress': { label: 'In Progress', cls: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300' },
  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

export const FollowupQueue: React.FC = () => {
  const [filter, setFilter] = useState<'all' | Status>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <section>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Follow-up Queue
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{tasks.length} tasks this shift</p>
          </div>
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'in-progress', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full capitalize transition-colors duration-150 ${
                  filter === f
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 dark:border-slate-700/40">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Nurse</th>
                <th className="text-left px-5 py-3">Priority</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {filtered.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors duration-100"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-slate-400">{task.id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.patient}</p>
                    <p className="text-xs text-slate-400">{task.ward}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{task.type}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{task.nurse}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-md capitalize ${priorityConfig[task.priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${statusConfig[task.status].cls}`}>
                      {statusConfig[task.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{task.due}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};