import React, { useState } from 'react';
import {
    Calendar, Eye, Mail, FlaskConical, Loader2, AlertCircle, Search, FileText,
    FileStack,
} from 'lucide-react';
import {
    useG6PDSummary,
    useGenerateG6PDIndividual,
    useGenerateG6PDSummary,
} from '../../../hooks/FollowupHooks/useAutoMailer';
import type { G6PDRecord } from '../../../services/FollowupServices/autoMailerServices';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today        = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
const fmtISO = (d: Date) => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface G6PDSummaryTableProps {
    onViewReport:         (record: G6PDRecord, fileName: string | null) => void;
    onViewPIS:            (record: G6PDRecord) => void;
    onSendEmail:          (record: G6PDRecord) => void;
    onGenerating?:        (record: G6PDRecord) => void;
    /** Fires as soon as Generate All is clicked — passes date range for the modal title */
    onSummaryGenerating?: (dateFrom: string, dateTo: string) => void;
    /** Fires when the summary PDF generation settles — fileName or null on no-data/error */
    onSummaryReport?:     (fileName: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const G6PDSummaryTable: React.FC<G6PDSummaryTableProps> = ({
    onViewReport,
    onViewPIS,
    onSendEmail,
    onGenerating,
    onSummaryGenerating,
    onSummaryReport,
}) => {
    const [dateFrom,    setDateFrom]    = useState(fmtISO(firstOfMonth));
    const [dateTo,      setDateTo]      = useState(fmtISO(lastOfMonth));
    const [search,      setSearch]      = useState('');
    const [shouldFetch, setShouldFetch] = useState(true);

    // ── Table data ─────────────────────────────────────────────────────
    const {
        data,
        isLoading,
        isError,
        error,
        isFetching,
    } = useG6PDSummary({ dateFrom, dateTo }, shouldFetch);

    const rows = data?.data ?? [];

    const handleGenerate = () => {
        if (!dateFrom || !dateTo) return;
        setShouldFetch(false);
        setTimeout(() => setShouldFetch(true), 0);
    };

    const handleDateFromChange = (val: string) => {
        setDateFrom(val);
        setShouldFetch(false);
    };
    const handleDateToChange = (val: string) => {
        setDateTo(val);
        setShouldFetch(false);
    };

    // ── Per-row individual report ──────────────────────────────────────
    const { mutate: generateIndividual, isPending: isGeneratingRow, variables: rowVariables } =
        useGenerateG6PDIndividual();

    const handleViewReportClick = (row: G6PDRecord) => {
        const labNo = row.LABNO ?? '';
        if (!labNo) return;

        onGenerating?.(row);
        onViewReport(row, null);

        generateIndividual(
            { labNo },
            {
                onSuccess: (result) => {
                    onViewReport(row, result.hasData ? result.fileName : null);
                },
                onError: () => {
                    onViewReport(row, null);
                },
            },
        );
    };

    const isRowGenerating = (row: G6PDRecord) =>
        isGeneratingRow && rowVariables?.labNo === row.LABNO;

    // ── Generate All (summary PDF) ─────────────────────────────────────
    const {
        mutate:    generateSummaryPdf,
        isPending: isGeneratingSummary,
        data:      summaryPdfResult,
        isError:   isSummaryGenError,
        error:     summaryGenError,
        reset:     resetSummaryPdf,
    } = useGenerateG6PDSummary();

    const handleGenerateAll = () => {
        if (!dateFrom || !dateTo) return;
        resetSummaryPdf();
        onSummaryGenerating?.(dateFrom, dateTo);
        generateSummaryPdf(
            { dateFrom, dateTo },
            {
                onSuccess: (result) => {
                    onSummaryReport?.(
                        result.hasData && result.fileName ? result.fileName : null,
                    );
                },
                onError: () => {
                    onSummaryReport?.(null);
                },
            },
        );
    };

    // ── Client-side search filter ──────────────────────────────────────
    const filtered = rows.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.LABNO?.toLowerCase().includes(q)         ||
            r.LNAME?.toLowerCase().includes(q)         ||
            r.FNAME?.toLowerCase().includes(q)         ||
            r.SUBMID?.toLowerCase().includes(q)        ||
            r.PROVIDER_NAME?.toLowerCase().includes(q)
        );
    });

    const hasFetched = shouldFetch && !isLoading;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col overflow-hidden h-full">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <FlaskConical size={14} className="text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                G6PD Summary Report
                            </h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                                Filter by date received range
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isFetching && !isLoading && (
                            <Loader2 size={13} className="animate-spin text-emerald-400" />
                        )}
                        {!isLoading && rows.length > 0 && (
                            <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                                {filtered.length.toLocaleString()} / {rows.length} record{rows.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo}
                            onChange={e => handleDateFromChange(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[7.5rem]"
                        />
                    </label>

                    <span className="text-slate-400 text-xs">—</span>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            onChange={e => handleDateToChange(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[7.5rem]"
                        />
                    </label>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !dateFrom || !dateTo}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-sm shadow-emerald-200 dark:shadow-none"
                    >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                        Generate
                    </button>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ml-auto cursor-text">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search name, lab no, facility..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none w-44"
                        />
                    </label>
                </div>
            </div>

            {/* ── Table body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                        <Loader2 size={24} className="animate-spin text-emerald-400" />
                        <p className="text-sm">Loading records…</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <AlertCircle size={24} className="text-rose-400" />
                        <p className="text-sm text-rose-500">{(error as Error)?.message ?? 'Failed to load data'}</p>
                    </div>
                ) : hasFetched && filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                        <FlaskConical size={26} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm">No records found for the selected date range</p>
                    </div>
                ) : !shouldFetch ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                        <Calendar size={26} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm">Adjust the date range and click Generate</p>
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
                            {filtered.map((row, i) => (
                                <tr
                                    key={`${row.LABNO}-${i}`}
                                    className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors group"
                                >
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge label={row.LABNO} color="blue" />
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs leading-tight">
                                            {row.LNAME ?? '—'}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight">
                                            {row.FNAME ?? ''}
                                        </p>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge label={row.SUBMID} color="emerald" />
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-900/10 transition-colors">
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

            {/* ── Footer — Generate All ────────────────────────────── */}
            <div className="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleGenerateAll}
                        disabled={isGeneratingSummary || !dateFrom || !dateTo}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                        {isGeneratingSummary
                            ? <Loader2 size={12} className="animate-spin" />
                            : <FileStack size={12} />
                        }
                        Generate All ({dateFrom} → {dateTo})
                    </button>

                    {isGeneratingSummary && (
                        <span className="text-[11px] text-slate-400">Generating consolidated PDF…</span>
                    )}

                    {isSummaryGenError && (
                        <span className="flex items-center gap-1 text-[11px] text-rose-500">
                            <AlertCircle size={12} />
                            {(summaryGenError as Error)?.message ?? 'Failed to generate report'}
                        </span>
                    )}

                    {summaryPdfResult && !summaryPdfResult.hasData && !isGeneratingSummary && (
                        <span className="text-[11px] text-slate-400">
                            No records found for this date range — nothing to generate.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};