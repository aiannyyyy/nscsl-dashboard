import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { EndorsementMnemonicChart } from '../followup/components/EndorsementMnemonicChart';
import { EndorsementCategoryChart } from '../followup/components/EndorsementCategoryChart';
import { EndorsementToFollowUpTable } from '../followup/components/EndorsementFromLaboratory';
import {
  useLogbookEndorsementRecalledSectionList,
} from "../../hooks/FollowupHooks/useFunLogbookEndorsements";

/** Returns "YYYY-MM-DD" for a given Date (local time). */
const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplay = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
};

const today = toDateString(new Date());

export const EndorsementToFollowUp: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const endorsementIdParam = searchParams.get('endorsementId');
  /** Full archive so deep links resolve after FUN recall leaves the pending queue */
  const { data: endorsementArchiveData } = useLogbookEndorsementRecalledSectionList();

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [chartsExpanded, setChartsExpanded] = useState<'mnemonic' | 'category' | null>(null);

  /** When opening from a notification link, jump to the record's date so it appears in the table */
  useEffect(() => {
    if (!endorsementIdParam || !endorsementArchiveData?.data?.length) return;
    const id = Number(endorsementIdParam);
    if (!Number.isFinite(id)) return;
    const row = endorsementArchiveData.data.find((r) => r.id === id);
    if (!row?.date_input) return;
    const y = row.date_input.trim().slice(0, 10);
    if (y) setSelectedDate(y);
  }, [endorsementIdParam, endorsementArchiveData?.data]);

  const clearEndorsementFocusParam = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const goBack = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateString(d));
  };

  const goForward = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateString(d));
  };

  const isToday = selectedDate === today;

  return (
    <div className="space-y-6">
      {/* ── Date picker bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm px-2 py-1.5">
          <button
            type="button"
            onClick={goBack}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer"
            />
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
              {formatDisplay(selectedDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={goForward}
            disabled={isToday}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Back to today
          </button>
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-12 gap-6">
        <div
          className={`transition-all duration-300 ${
            chartsExpanded === 'mnemonic'
              ? 'col-span-8'
              : chartsExpanded === 'category'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <EndorsementMnemonicChart
            selectedDate={selectedDate}
            expanded={chartsExpanded === 'mnemonic'}
            onExpand={() => setChartsExpanded(chartsExpanded === 'mnemonic' ? null : 'mnemonic')}
          />
        </div>

        <div
          className={`transition-all duration-300 ${
            chartsExpanded === 'category'
              ? 'col-span-8'
              : chartsExpanded === 'mnemonic'
              ? 'col-span-4'
              : 'col-span-6'
          }`}
        >
          <EndorsementCategoryChart
            selectedDate={selectedDate}
            expanded={chartsExpanded === 'category'}
            onExpand={() => setChartsExpanded(chartsExpanded === 'category' ? null : 'category')}
          />
        </div>
      </div>

      {/* ── Table row ── */}
      <div>
        <EndorsementToFollowUpTable
          selectedDate={selectedDate}
          focusEndorsementId={endorsementIdParam}
          onConsumedFocusEndorsement={clearEndorsementFocusParam}
        />
      </div>
    </div>
  );
};

export const LogbookEndorsement = EndorsementToFollowUp;