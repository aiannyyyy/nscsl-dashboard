import React, { useState } from 'react';
import { Search, Eye, Mail, FlaskConical, Loader2, AlertCircle, FileText } from 'lucide-react';
import {
    useG6PDIndividual,
    useG6PDSummary,
    useGenerateG6PDIndividual,
} from '../../../hooks/FollowupHooks/useAutoMailer';
import type { G6PDRecord } from '../../../services/FollowupServices/autoMailerServices';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtISO = (d: Date) => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const TODAY = fmtISO(new Date());

// Re-export so other components can import from here without changing imports
export type { G6PDRecord };

// ─── Props ────────────────────────────────────────────────────────────────────

interface G6PDIndividualTableProps {
    // fileName is passed once generation succeeds (null while generating / on no-data)
    onViewReport: (record: G6PDRecord, fileName: string | null) => void;
    onViewPIS:    (record: G6PDRecord) => void;
    onSendEmail:  (record: G6PDRecord) => void;
    onGenerating?: (record: G6PDRecord) => void;
}

const Badge: React.FC<{ label?: string | null; color?: 'slate' | 'emerald' | 'amber' | 'blue' }> = ({
    label, color = 'slate',
}) => {
    const styles = {
        slate:   'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
        emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${styles[color]}`}>
            {label ?? '—'}
        </span>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const G6PDIndividualTable: React.FC<G6PDIndividualTableProps> = ({
    onViewReport,
    onViewPIS,
    onSendEmail,
    onGenerating,
}) => {
    const [labno,     setLabno]     = useState('');
    const [committed, setCommitted] = useState('');

    // ── When no labno is committed, show today's records as the default view
    const isSearchMode = committed.trim() !== '';

    const todayQuery = useG6PDSummary(
        { dateFrom: TODAY, dateTo: TODAY },
        !isSearchMode, // only fetch when not in search mode
    );

    const searchQuery = useG6PDIndividual({ labno: committed });

    const {
        data,
        isLoading,
        isError,
        error,
        isFetching,
    } = isSearchMode ? searchQuery : todayQuery;

    const rows = data?.data ?? [];

    // ── PDF generation (per-row "View Report") ──────────────────────────
    const { mutate: generateReport, isPending: isGeneratingReport, variables } =
        useGenerateG6PDIndividual();

    const handleViewReportClick = (row: G6PDRecord) => {
        const labNo = row.LABNO ?? '';
        if (!labNo) return;

        onGenerating?.(row);
        // Let the parent show the "generating" state immediately
        onViewReport(row, null);

        generateReport(
            { labNo },
            {
                onSuccess: (result) => {
                    const fileName = result.hasData ? result.fileName : null;
                    onViewReport(row, fileName);
                },
                onError: () => {
                    onViewReport(row, null);
                },
            },
        );
    };

    const isRowGenerating = (row: G6PDRecord) =>
        isGeneratingReport && variables?.labNo === row.LABNO;

    const handleSearch = () => {
        const trimmed = labno.trim();
        if (!trimmed) return;
        setCommitted(trimmed);
    };

    const handleClearSearch = () => {
        setLabno('');
        setCommitted('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col overflow-hidden h-full"
        >
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <FlaskConical size={14} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                G6PD Individual Report
                            </h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                                {isSearchMode ? 'Showing search result' : "Showing today's records — search by Lab No."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isFetching && !isLoading && (
                            <Loader2 size={13} className="animate-spin text-blue-400" />
                        )}
                        {!isLoading && rows.length > 0 && (
                            <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                                {rows.length} record{rows.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Search bar */}
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-text">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Enter Lab No."
                            value={labno}
                            onChange={e => setLabno(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none w-full"
                        />
                    </label>

                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !labno.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
                    >
                        {isLoading
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Search size={12} />
                        }
                        Search
                    </button>

                    {isSearchMode && (
                        <button
                            onClick={handleClearSearch}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Table body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                        <Loader2 size={24} className="animate-spin text-blue-400" />
                        <p className="text-sm">Fetching record…</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <AlertCircle size={24} className="text-rose-400" />
                        <p className="text-sm text-rose-500">{(error as Error)?.message ?? 'Failed to load data'}</p>
                    </div>
                ) : isSearchMode && rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                        <FlaskConical size={26} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm">No G6PD record found for <span className="font-semibold">{committed}</span></p>
                    </div>
                ) : !isSearchMode && rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                        <FlaskConical size={26} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm">No G6PD records received today</p>
                    </div>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50/95 dark:bg-slate-800/95 border-b border-slate-100 dark:border-slate-700">
                                {['Lab No.', 'Patient Name', 'Facility Code', 'Actions'].map(h => (
                                    <th
                                        key={h}
                                        className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={`${row.LABNO}-${i}`}
                                    className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                                >
                                    {/* Lab No. */}
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge label={row.LABNO} color="blue" />
                                    </td>

                                    {/* Patient Name */}
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs leading-tight">
                                            {row.LNAME ?? '—'}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight">
                                            {row.FNAME ?? ''}
                                        </p>
                                    </td>

                                    {/* Facility Code */}
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge label={row.SUBMID} color="emerald" />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-2.5 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleViewReportClick(row)}
                                                disabled={isRowGenerating(row)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                                            >
                                                {isRowGenerating(row)
                                                    ? <Loader2 size={11} className="animate-spin" />
                                                    : <Eye size={11} />
                                                }
                                                View Report
                                            </button>
                                            <button
                                                onClick={() => onViewPIS(row)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                                            >
                                                <FileText size={11} />
                                                View PIS
                                            </button>
                                            <button
                                                onClick={() => onSendEmail(row)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                            >
                                                <Mail size={11} />
                                                Send Email
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};