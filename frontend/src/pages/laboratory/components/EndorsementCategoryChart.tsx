import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { Maximize2, Minimize2, Tag } from 'lucide-react';
import { useLogbookCategoryStats } from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  expanded: boolean;
  onExpand: () => void;
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
];

// ─── Active Shape (expanded slice on hover) ───────────────────────────────────
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, value,
  } = props;

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
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#9ca3af" fontSize={11}>
        {pct}%
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const EndorsementCategoryChart: React.FC<Props> = ({ expanded, onExpand }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const { data, isLoading } = useLogbookCategoryStats();
  const chartData = (data?.data || []).map((item) => ({ ...item, __total: 0 }));
  const total = chartData.reduce((sum, item) => sum + Number(item.count || 0), 0);
  chartData.forEach((item) => {
    item.__total = total;
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
            <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              Endorsements by Category
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Distribution across lab departments
            </p>
          </div>
        </div>

        <button
          onClick={onExpand}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Chart + Legend */}
      <div className="flex items-center gap-2 px-4 py-4">
        {isLoading ? (
          <div className="w-full h-[260px] flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-[260px] flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            No category data yet.
          </div>
        ) : (
          <>
        {/* Donut */}
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

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {chartData.map((item, index) => {
            const pct = total ? ((Number(item.count) / total) * 100).toFixed(1) : '0.0';
            return (
              <button
                key={item.category}
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1 transition-colors
                  ${activeIndex === index
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                  {item.category}
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
          </>
        )}
      </div>

      {/* Footer total */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">Total follow-ups:</span>
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
};