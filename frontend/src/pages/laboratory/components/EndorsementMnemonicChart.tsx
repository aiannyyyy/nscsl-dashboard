import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Maximize2, Minimize2, FlaskConical } from 'lucide-react';
import { useLogbookEndorsementList } from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';

interface Props {
  selectedDate: string; // "YYYY-MM-DD"
  expanded: boolean;
  onExpand: () => void;
}

const BAR_COLORS = [
  '#3b82f6', '#06b6d4', '#6366f1', '#0ea5e9', '#8b5cf6',
  '#14b8a6', '#a78bfa', '#38bdf8', '#818cf8', '#2dd4bf',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {payload[0].value.toLocaleString()}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">endorsements</span>
        </p>
      </div>
    );
  }
  return null;
};

/** Extract "YYYY-MM-DD" from any datetime string. */
const toDateOnly = (raw: string | null | undefined): string =>
  raw ? raw.trim().slice(0, 10) : '';

export const EndorsementMnemonicChart: React.FC<Props> = ({ selectedDate, expanded, onExpand }) => {
  const { data, isLoading } = useLogbookEndorsementList();

  const chartData = useMemo(() => {
    const records = (data?.data || []).filter(
      (r) => toDateOnly(r.date_input) === selectedDate
    );

    const mnemonicMap = new Map<string, Set<string>>();
    for (const r of records) {
      const key = r.mnemonic || 'N/A';
      if (!mnemonicMap.has(key)) mnemonicMap.set(key, new Set());
      mnemonicMap.get(key)!.add(r.labno);
    }

    return [...mnemonicMap.entries()]
      .map(([mnemonic, labnos]) => ({ mnemonic, count: labnos.size }))
      .sort((a, b) => b.count - a.count);
  }, [data?.data, selectedDate]);

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              Endorsements by Mnemonic
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Unique Endorsements as per Mnemonic
            </p>
          </div>
        </div>
        <button
          onClick={onExpand}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-4 py-4" style={{ height: 300 }}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            No mnemonic data for {selectedDate}.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-gray-700" vertical={false} />
              <XAxis dataKey="mnemonic" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-5 pb-4 flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">Total Unique Mnemonic:</span>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{total.toLocaleString()}</span>
      </div>
    </div>
  );
};