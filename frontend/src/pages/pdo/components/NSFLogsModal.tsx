// src/pages/PDO/components/NSFLogsModal.tsx
import React from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight, CalendarDays, Download, Eye } from 'lucide-react';
import { useNSFReactivationLogs, useNSFFacility } from '../../../hooks/PDOHooks/useNSFFacilities';
import { NSFDetailModal } from './NSFDetailModal';
import type { NSFLogAction } from '../../../services/PDOServices/nsfFacilitesServices';
import type { NSFRecord } from './NSFTable';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES: Record<string, string> = {
    '1': 'January', '2': 'February', '3': 'March',     '4': 'April',
    '5': 'May',     '6': 'June',     '7': 'July',      '8': 'August',
    '9': 'September','10': 'October','11': 'November', '12': 'December',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface NSFLogsModalProps {
    open:        boolean;
    onClose:     () => void;
    title:       string;
    subtitle?:   string;
    action?:     NSFLogAction;
    facilityId?: number;
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

const ACTION_LABELS: Record<string, string> = {
    added:       'Added',
    reactivated: 'Reactivated',
    deactivated: 'Deactivated',
    deleted:     'Deleted',
};

const ACTION_ACTIVE_STYLES: Record<string, string> = {
    all:         'bg-gray-700   text-white  dark:bg-gray-200    dark:text-gray-900',
    added:       'bg-blue-500   text-white  dark:bg-blue-400    dark:text-white',
    reactivated: 'bg-green-500  text-white  dark:bg-green-400   dark:text-white',
    deactivated: 'bg-amber-500  text-white  dark:bg-amber-400   dark:text-white',
    deleted:     'bg-red-500    text-white  dark:bg-red-400     dark:text-white',
};

const ACTION_IDLE_STYLES: Record<string, string> = {
    all:         'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    added:       'border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    reactivated: 'border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    deactivated: 'border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    deleted:     'border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
};

type FilterAction = NSFLogAction | 'all';

const FILTER_OPTIONS: { key: FilterAction; label: string }[] = [
    { key: 'all',         label: 'All'         },
    { key: 'added',       label: 'Added'       },
    { key: 'reactivated', label: 'Reactivated' },
    { key: 'deactivated', label: 'Deactivated' },
    { key: 'deleted',     label: 'Deleted'     },
];

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

// ─── Expandable Remarks Cell ──────────────────────────────────────────────────
const RemarksCell: React.FC<{ text: string | null }> = ({ text }) => {
    const [expanded, setExpanded] = React.useState(false);
    if (!text) return <span className="text-gray-400">—</span>;
    const isLong = text.length > 60;
    return (
        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">
            <span>{expanded || !isLong ? text : `${text.slice(0, 60)}…`}</span>
            {isLong && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium whitespace-nowrap"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
};

// ─── CSV Export Helper ────────────────────────────────────────────────────────
const exportToCSV = (logs: any[], title: string, periodLabel: string) => {
    const headers = ['Facility Name', 'Facility Code', 'Action', 'Old Status', 'New Status', 'Province', 'Remarks', 'By', 'Date'];
    const rows = logs.map(log => [
        log.facility_name ?? '',
        log.facility_code ?? '',
        log.action        ?? '',
        log.old_status    ?? '',
        log.new_status    ?? '',
        log.province      ?? '',
        log.remarks       ?? '',
        log.created_by    ?? '',
        formatDate(log.created_at),
    ]);
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}${periodLabel ? `_${periodLabel.replace(/\s+/g, '_')}` : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// ─── Facility Detail Fetcher ──────────────────────────────────────────────────
const FacilityDetailFetcher: React.FC<{
    facilityId: number;
    onClose:    () => void;
}> = ({ facilityId, onClose }) => {
    const { data, isLoading } = useNSFFacility(facilityId);

    if (isLoading) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <NSFDetailModal
            record={data as NSFRecord ?? null}
            onClose={onClose}
        />
    );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFLogsModal: React.FC<NSFLogsModalProps> = ({
    open,
    onClose,
    title,
    subtitle,
    action: actionProp,
    facilityId,
    month,
    year,
}) => {
    const [page,               setPage]               = React.useState(1);
    const [activeFilter,       setActiveFilter]       = React.useState<FilterAction>('all');
    const [knownActions,       setKnownActions]       = React.useState<Set<string>>(new Set());
    const [selectedFacilityId, setSelectedFacilityId] = React.useState<number | null>(null);

    React.useEffect(() => {
        setPage(1);
        setActiveFilter(actionProp ?? 'all');
        setKnownActions(new Set());
        setSelectedFacilityId(null);
    }, [month, year, actionProp, facilityId, open]);

    const LIMIT = 8;
    const resolvedAction = activeFilter === 'all' ? undefined : activeFilter;

    const { data: resp, isLoading, isError } = useNSFReactivationLogs(
        open
            ? {
                action:      resolvedAction,
                facility_id: facilityId,
                page,
                limit:       LIMIT,
                month:       month !== 'All' ? month : undefined,
                year,
            }
            : undefined
    );

    const logs       = resp?.data        ?? [];
    const total      = resp?.total       ?? 0;
    const totalPages = resp?.total_pages ?? 1;

    React.useEffect(() => {
        if (activeFilter === 'all' && logs.length > 0) {
            setKnownActions(prev => {
                const next = new Set(prev);
                logs.forEach(log => next.add(log.action));
                return next;
            });
        }
    }, [logs, activeFilter]);

    const periodLabel = month && month !== 'All'
        ? `${MONTH_NAMES[month] ?? month} ${year}`
        : (year ?? '');

    const actionCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        logs.forEach(log => { counts[log.action] = (counts[log.action] ?? 0) + 1; });
        return counts;
    }, [logs]);

    const handleFilter = (key: FilterAction) => {
        setActiveFilter(key);
        setPage(1);
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">

                    {/* ── Header ────────────────────────────────────────────── */}
                    <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                            {subtitle && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {periodLabel && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-xs font-medium text-blue-700 dark:text-blue-300">
                                        <CalendarDays size={11} />
                                        {periodLabel}
                                    </span>
                                )}
                                {!isLoading && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {total.toLocaleString()} log{total !== 1 ? 's' : ''} found
                                    </span>
                                )}
                            </div>

                            {/* ── Action Filter Buttons ──────────────────────── */}
                            {!isLoading && total > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <button
                                        onClick={() => handleFilter('all')}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                                            activeFilter === 'all' ? ACTION_ACTIVE_STYLES['all'] : ACTION_IDLE_STYLES['all']
                                        }`}
                                    >
                                        All
                                        <span className={`ml-0.5 ${activeFilter === 'all' ? 'opacity-80' : 'opacity-60'}`}>
                                            · {total.toLocaleString()}
                                        </span>
                                    </button>
                                    {FILTER_OPTIONS.filter(({ key }) => key !== 'all' && knownActions.has(key)).map(({ key, label }) => {
                                        const isActive = activeFilter === key;
                                        const count    = actionCounts[key];
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleFilter(key)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                                                    isActive ? ACTION_ACTIVE_STYLES[key] : ACTION_IDLE_STYLES[key]
                                                }`}
                                            >
                                                {label}
                                                {activeFilter === 'all' && count !== undefined && (
                                                    <span className="ml-0.5 opacity-60">· {count}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors flex-shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Body ──────────────────────────────────────────────── */}
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
                                )}
                                {activeFilter !== 'all' && (
                                    <> with action <span className="font-medium text-gray-600 dark:text-gray-300">{ACTION_LABELS[activeFilter]}</span></>
                                )}.
                            </div>
                        ) : (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <table className="w-full text-sm table-fixed">
                                    <colgroup>
                                        <col style={{ width: '21%' }} /> {/* Facility      */}
                                        <col style={{ width: '10%' }} /> {/* Action        */}
                                        <col style={{ width: '16%' }} /> {/* Status Change */}
                                        <col style={{ width: '9%'  }} /> {/* Province      */}
                                        <col style={{ width: '19%' }} /> {/* Remarks       */}
                                        <col style={{ width: '9%'  }} /> {/* By            */}
                                        <col style={{ width: '12%' }} /> {/* Date          */}
                                        <col style={{ width: '4%'  }} /> {/* Eye icon      */}
                                    </colgroup>
                                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            {['Facility', 'Action', 'Status Change', 'Province', 'Remarks', 'By', 'Date', ''].map(h => (
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
                                                {/* Facility */}
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">{log.facility_name ?? '—'}</p>
                                                    <p className="text-gray-400 dark:text-gray-500 text-xs">{log.facility_code ?? ''}</p>
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <Badge label={log.action} styleMap={ACTION_STYLES} />
                                                </td>

                                                {/* Status Change */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        {log.old_status
                                                            ? <Badge label={log.old_status} styleMap={STATUS_STYLES} />
                                                            : <span className="text-xs text-gray-400 italic">none</span>
                                                        }
                                                        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                                                        {log.new_status
                                                            ? <Badge label={log.new_status} styleMap={STATUS_STYLES} />
                                                            : <span className="text-xs text-gray-400 italic">deleted</span>
                                                        }
                                                    </div>
                                                </td>

                                                {/* Province */}
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                                    {log.province ?? '—'}
                                                </td>

                                                {/* Remarks */}
                                                <td className="px-4 py-3 min-w-0">
                                                    <RemarksCell text={log.remarks} />
                                                </td>

                                                {/* By */}
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                                    {log.created_by ?? '—'}
                                                </td>

                                                {/* Date */}
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-500">
                                                    {formatDate(log.created_at)}
                                                </td>

                                                {/* Eye Icon */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => setSelectedFacilityId(log.facility_id)}
                                                        className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                                        title="View Facility Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Footer / Pagination ────────────────────────────────── */}
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportToCSV(logs, title, periodLabel)}
                                disabled={logs.length === 0 || isLoading}
                                className="h-8 px-3 text-xs rounded-lg border border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                            >
                                <Download size={13} />
                                Export CSV
                            </button>
                            <button
                                onClick={onClose}
                                className="h-8 px-4 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Facility Detail Modal (on top of logs modal) ─────────────── */}
            {selectedFacilityId !== null && (
                <FacilityDetailFetcher
                    facilityId={selectedFacilityId}
                    onClose={() => setSelectedFacilityId(null)}
                />
            )}
        </>
    );
};