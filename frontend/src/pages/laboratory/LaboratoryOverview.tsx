import React, { useState } from 'react';
import { SummaryCards } from './components/SummaryCards';
import { DailyComparisonChart } from './components/DailyComparisonChart';
import { TrackingSystemTable } from './components/TrackingSystemTable';
import { YTDComparisonChart } from './components/YTDComparisonChart';
import { CumulativeMonthlyChart } from './components/CumulativeMonthlyChart';
import { CumulativeAnnualChart } from './components/CumulativeAnnualChart';

export const LaboratoryOverview: React.FC = () => {
  const [row2Expanded, setRow2Expanded] = useState<'daily' | 'ytd' | null>(null);
  const [row3Expanded, setRow3Expanded] = useState<'cumMonthly' | 'cumAnnual' | null>(null);

  return (
    <div className="space-y-6">

      {/* Row 1: Summary Cards (50%) + Tracking System (50%) */}
      <div className="grid grid-cols-2 gap-6">
        <SummaryCards />
        <TrackingSystemTable />
      </div>

      {/* Row 2: Daily + YTD */}
      <div className="grid grid-cols-12 gap-6">
        <div
          className={`transition-all duration-300 ${
            row2Expanded === 'daily'
              ? 'col-span-8'
              : row2Expanded === 'ytd'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <DailyComparisonChart
            expanded={row2Expanded === 'daily'}
            onExpand={() => setRow2Expanded(row2Expanded === 'daily' ? null : 'daily')}
          />
        </div>
        <div
          className={`transition-all duration-300 ${
            row2Expanded === 'ytd'
              ? 'col-span-8'
              : row2Expanded === 'daily'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <YTDComparisonChart
            expanded={row2Expanded === 'ytd'}
            onExpand={() => setRow2Expanded(row2Expanded === 'ytd' ? null : 'ytd')}
          />
        </div>
      </div>

      {/* Row 3: Cumulative Monthly + Cumulative Annual */}
      <div className="grid grid-cols-12 gap-6">
        <div
          className={`transition-all duration-300 ${
            row3Expanded === 'cumMonthly'
              ? 'col-span-8'
              : row3Expanded === 'cumAnnual'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <CumulativeMonthlyChart
            expanded={row3Expanded === 'cumMonthly'}
            onExpand={() => setRow3Expanded(row3Expanded === 'cumMonthly' ? null : 'cumMonthly')}
          />
        </div>
        <div
          className={`transition-all duration-300 ${
            row3Expanded === 'cumAnnual'
              ? 'col-span-8'
              : row3Expanded === 'cumMonthly'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <CumulativeAnnualChart
            expanded={row3Expanded === 'cumAnnual'}
            onExpand={() => setRow3Expanded(row3Expanded === 'cumAnnual' ? null : 'cumAnnual')}
          />
        </div>
      </div>

    </div>
  );
};