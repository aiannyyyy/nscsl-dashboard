import React, { useState } from 'react';
import { useLabTrackingStats } from '../../../hooks/LaboratoryHooks/useLabTrackingStats';

// ─────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthToNumber = (month: string): number => MONTHS.indexOf(month) + 1;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TrackingData {
  month: string;
  dtcoll_dtrecv: { ave: number; med: number; mod: number };
  dtrecv_dtrelease: { ave: number; med: number; mod: number };
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const IconVial = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 3h6M9 3v8l-3 6a2 2 0 001.8 2.9h8.4A2 2 0 0018 17l-3-6V3" />
  </svg>
);

const IconInbox = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─────────────────────────────────────────────
// Pipeline Node — compact for half-width
// ─────────────────────────────────────────────

interface PipelineNodeProps {
  code: string;
  label: string;
  icon: React.ReactNode;
}

const PipelineNode: React.FC<PipelineNodeProps> = ({ code, label, icon }) => (
  <div className="flex flex-col items-center gap-1 shrink-0">
    <div className="w-9 h-9 rounded-full flex items-center justify-center border-2
                    border-blue-200 dark:border-blue-800
                    bg-blue-50 dark:bg-blue-900/30
                    text-blue-500 dark:text-blue-400">
      {icon}
    </div>
    <div className="text-center">
      <div className="text-[10px] font-bold text-gray-700 dark:text-gray-200 tracking-tight leading-tight">{code}</div>
      <div className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">{label}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Metric segment card + arrow connector
// ─────────────────────────────────────────────

interface SegmentProps {
  color: 'blue' | 'teal';
  ave: number;
  med: number;
  mod: number;
}

const SEGMENT_COLORS = {
  blue: {
    card:  'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900',
    muted: 'text-blue-400 dark:text-blue-500',
    val:   'text-blue-800 dark:text-blue-200',
    line:  'bg-blue-200 dark:bg-blue-800',
    arrow: 'text-blue-300 dark:text-blue-700',
  },
  teal: {
    card:  'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900',
    muted: 'text-teal-400 dark:text-teal-500',
    val:   'text-teal-800 dark:text-teal-200',
    line:  'bg-teal-200 dark:bg-teal-800',
    arrow: 'text-teal-300 dark:text-teal-700',
  },
};

const Segment: React.FC<SegmentProps> = ({ color, ave, med, mod }) => {
  const c = SEGMENT_COLORS[color];
  return (
    <div className="flex-1 flex flex-col items-stretch gap-1.5 min-w-0 pt-0.5">
      {/* Compact metric card */}
      <div className={`rounded-lg border px-2 py-2 ${c.card}`}>
        <div className="grid grid-cols-3 gap-0.5 text-center">
          {[
            { key: 'AVE', val: ave },
            { key: 'MED', val: med },
            { key: 'MOD', val: mod },
          ].map(({ key, val }) => (
            <div key={key}>
              <div className={`text-[9px] font-semibold uppercase tracking-wider ${c.muted}`}>{key}</div>
              <div className={`text-sm font-bold tabular-nums leading-tight ${c.val}`}>
                {val.toFixed(2)}
              </div>
              <div className={`text-[9px] ${c.muted}`}>days</div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow connector */}
      <div className="flex items-center">
        <div className={`flex-1 h-px ${c.line}`} />
        <svg
          className={`w-3 h-3 shrink-0 ${c.arrow}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────────

const Skeleton: React.FC = () => (
  <div className="flex items-start gap-1 animate-pulse">
    {[0, 1, 2].map((i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-2 w-10 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-1.5 w-8 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
        {i < 2 && (
          <div className="flex-1 flex flex-col gap-2 pt-0.5 min-w-0">
            <div className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const TrackingSystemTable: React.FC = () => {
  const currentDate = new Date();
  const [year, setYear]   = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState(MONTHS[currentDate.getMonth()]);

  const years = Array.from({ length: 12 }, (_, i) =>
    (currentDate.getFullYear() - i).toString()
  );

  const monthNumber = monthToNumber(month);

  const { data: apiData, isLoading, isError } = useLabTrackingStats({
    year:  Number(year),
    month: monthNumber,
  });

  const data: TrackingData | null = apiData
    ? {
        month: month.substring(0, 3),
        dtcoll_dtrecv: {
          ave: apiData.data.dtcoll_to_dtrecv.average,
          med: apiData.data.dtcoll_to_dtrecv.median,
          mod: apiData.data.dtcoll_to_dtrecv.mode,
        },
        dtrecv_dtrelease: {
          ave: apiData.data.dtrecv_to_dtrptd.average,
          med: apiData.data.dtrecv_to_dtrptd.median,
          mod: apiData.data.dtrecv_to_dtrptd.mode,
        },
      }
    : null;

  const totalAve = data
    ? data.dtcoll_dtrecv.ave + data.dtrecv_dtrelease.ave
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              Tracking System
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
              End-to-end turnaround pipeline
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-7 px-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-7 px-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* Pipeline */}
      {isError ? (
        <div className="py-8 text-center text-sm text-red-400">
          Failed to load tracking data.
        </div>
      ) : isLoading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="flex items-start gap-1">
            <PipelineNode code="DTCOLL"   label="Collection" icon={<IconVial />}   />
            <Segment color="blue"
              ave={data.dtcoll_dtrecv.ave}
              med={data.dtcoll_dtrecv.med}
              mod={data.dtcoll_dtrecv.mod}
            />
            <PipelineNode code="DTRECV"   label="Received"   icon={<IconInbox />}  />
            <Segment color="teal"
              ave={data.dtrecv_dtrelease.ave}
              med={data.dtrecv_dtrelease.med}
              mod={data.dtrecv_dtrelease.mod}
            />
            <PipelineNode code="DTRELEASE" label="Released"  icon={<IconCheck />}  />
          </div>

          {/* Total turnaround pill */}
          {totalAve !== null && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">Total avg turnaround</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200
                               bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full tabular-nums">
                {totalAve.toFixed(2)} days
              </span>
            </div>
          )}
        </>
      )}

    </div>
  );
};