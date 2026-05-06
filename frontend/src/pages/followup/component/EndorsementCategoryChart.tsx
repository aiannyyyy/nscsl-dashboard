import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Maximize2, Minimize2, Tag } from 'lucide-react';
import { useLogbookEndorsementRecalledSectionList } from '../../../hooks/FollowupHooks/useFunLogbookEndorsements';
import type { LogbookEndorsementRecord } from '../../../services/FollowupServices/funLogbookEndorsementService';

interface Props {
  selectedDate: string; // "YYYY-MM-DD"
  expanded: boolean;
  onExpand: () => void;
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  const total = props?.payload?.__total || 1;
  const pct = ((value / total) * 100).toFixed(1);

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200" fontSize={13} fontWeight={700}>
        {payload.category}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-blue-500" fontSize={18} fontWeight={800}>
        {value.toLocaleString()}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#9ca3af" fontSize={11}>{pct}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

/** Extract "YYYY-MM-DD" from any datetime string. */
const toDateOnly = (raw: string | null | undefined): string =>
  raw ? raw.trim().slice(0, 10) : '';

const isFunRecallRecorded = (r: LogbookEndorsementRecord): boolean => {
  const fu = r.fun != null ? String(r.fun).trim() : '';
  const fd = r.fun_date != null ? String(r.fun_date).trim() : '';
  return Boolean(fu || fd);
};

export const EndorsementCategoryChart: React.FC<Props> = ({ selectedDate, expanded, onExpand }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const { data, isLoading } = useLogbookEndorsementRecalledSectionList();

  const chartData = useMemo(() => {
    const records = (data?.data ?? []).filter(
      (r) =>
        toDateOnly(r.date_input) === selectedDate && isFunRecallRecorded(r),
    );

    const categoryMap = new Map<string, Set<string>>();
    for (const r of records) {
      const key = r.category || 'Uncategorized';
      if (!categoryMap.has(key)) categoryMap.set(key, new Set());
      categoryMap.get(key)!.add(r.labno);
    }

    const total = [...categoryMap.values()].reduce((sum, set) => sum + set.size, 0);

    return [...categoryMap.entries()].map(([category, labnos]) => ({
      category,
      count: labnos.size,
      __total: total,
    }));
  }, [data?.data, selectedDate]);

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
            <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              Endorsements by Category (Recalled)
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              FUN recall completed only (pending queue excluded)
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

      <div className="flex items-center gap-2 px-4 py-4">
        {isLoading ? (
          <div className="w-full h-[260px] flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-[260px] flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            No recalled FUN endorsements for {selectedDate}.
          </div>
        ) : (
          <>
            <div style={{ width: '55%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={chartData}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {chartData.map((item, index) => {
                const pct = total ? ((item.count / total) * 100).toFixed(1) : '0.0';
                return (
                  <button
                    key={item.category}
                    onClick={() => setActiveIndex(index)}
                    className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1 transition-colors ${
                      activeIndex === index ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{item.category}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">{pct}%</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-4 flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">Total Unique Categories:</span>
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{total.toLocaleString()}</span>
      </div>
    </div>
  );
};