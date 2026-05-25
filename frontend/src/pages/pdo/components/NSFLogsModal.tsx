// src/pages/PDO/components/NSFLogsModal.tsx
import React from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight, CalendarDays } from 'lucide-react';
import { useNSFReactivationLogs } from '../../../hooks/PDOHooks/useNSFFacilities';
import type { NSFLogAction } from '../../../services/PDOServices/nsfFacilitesServices';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES: Record<string, string> = {
  '1': 'January', '2': 'February', '3': 'March',    '4': 'April',
  '5': 'May',     '6': 'June',     '7': 'July',     '8': 'August',
  '9': 'September','10': 'October','11': 'November','12': 'December',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface NSFLogsModalProps {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  subtitle?:   string;
  action?:     NSFLogAction;
  facilityId?: number;
  /** Passed directly from the chart's dropdowns — modal just reads them */
  month?:      string;
  year?:       string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, string> = {
  added:       'bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300',
  reactivated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  deactivated: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  deleted:     'bg-red-100   text-red-800   dark:bg-red-900/30   dark:text-red-300',
};

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300',
  inactive: 'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-300',
  closed:   'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300',
  partner:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const Badge: React.FC<{ label: string; styleMap: Record<string, string> }> = ({ label, styleMap }) => {
  if (!label) return <span className="text-gray-400">—</span>;
  const cls = styleMap[label.toLowerCase()] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {label.toUpperCase()}
    </span>
  );
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return '—';
  return new Date(val).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFLogsModal: React.FC<NSFLogsModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  action,
  facilityId,
  month,
  year,
}) => {
  const [page, setPage] = React.useState(1);

  // Reset to page 1 whenever the period or filters change
  React.useEffect(() => { setPage(1); }, [month, year, action, facilityId, open]);

  const LIMIT = 5;

  const { data: resp, isLoading, isError } = useNSFReactivationLogs(
    open
      ? {
          action,
          facility_id: facilityId,
          page,
          limit: LIMIT,
          month: month !== 'All' ? month : undefined,
          year,
        }
      : undefined
  );

  const logs       = resp?.data        ?? [];
  const total      = resp?.total       ?? 0;
  const totalPages = resp?.total_pages ?? 1;

  // e.g. "March 2025" or "2025" when month is 'All'
  const periodLabel = month && month !== 'All'
    ? `${MONTH_NAMES[month] ?? month} ${year}`
    : (year ?? '');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
            {/* Period badge — read-only, reflects chart selection */}
            {periodLabel && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-xs font-medium text-blue-700 dark:text-blue-300">
                <CalendarDays size={11} />
                {periodLabel}
              </span>
            )}
            {!isLoading && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {total.toLocaleString()} log{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Close button only — no dropdowns */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-red-500">Failed to load logs.</div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">
              No logs found
              {periodLabel && (
                <> for <span className="font-medium text-gray-600 dark:text-gray-300">{periodLabel}</span></>
              )}.
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Facility', 'Action', 'Status Change', 'Province', 'Remarks', 'By', 'Date'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((log, i) => (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        i % 2 === 0
                          ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{log.facility_name ?? '—'}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{log.facility_code ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge label={log.action} styleMap={ACTION_STYLES} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {log.old_status
                            ? <Badge label={log.old_status} styleMap={STATUS_STYLES} />
                            : <span className="text-xs text-gray-400">—</span>
                          }
                          {(log.old_status || log.new_status) && (
                            <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                          )}
                          {log.new_status
                            ? <Badge label={log.new_status} styleMap={STATUS_STYLES} />
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                        {log.province ?? '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={log.remarks ?? ''}>
                          {log.remarks ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                        {log.created_by ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer / Pagination ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {total > 0
              ? `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total.toLocaleString()}`
              : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="h-8 px-4 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};