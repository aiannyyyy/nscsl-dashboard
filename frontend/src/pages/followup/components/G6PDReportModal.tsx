import React, { useEffect, useState } from 'react';
import {
    X, FileText, Download, Maximize2, RefreshCw,
} from 'lucide-react';
import type { G6PDRecord } from './G6PDIndividualTable';
import api from '../../../services/api';

// ─── PDF blob hook ────────────────────────────────────────────────────────────

const useBlobUrl = (url: string | null) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!url) { setBlobUrl(null); return; }
        let revoked = false;
        setLoading(true);

        api.get(url, { responseType: 'blob' })
            .then(({ data: blob }) => {
                if (revoked) return;
                setBlobUrl(URL.createObjectURL(blob));
            })
            .catch(err => {
                console.error('PDF fetch error:', err);
                setBlobUrl(null);
            })
            .finally(() => setLoading(false));

        return () => {
            revoked = true;
            setBlobUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [url]);

    return { blobUrl, loading };
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface G6PDReportModalProps {
    record:       G6PDRecord | null;
    reportUrl:    string | null;
    isGenerating?: boolean;
    onClose:      () => void;
    /** When true, renders as an inline panel (no overlay/backdrop). */
    inline?:       boolean;
    onReportGenerated?: (url: string | null) => void;
    onGenerating?:      () => void;
}

// ─── Shared inner content ─────────────────────────────────────────────────────

const ReportContent: React.FC<{
    record:      G6PDRecord | null;
    blobUrl:     string | null;
    showSpinner: boolean;
    isGenerating: boolean;
    onClose:     () => void;
    inline:      boolean;
}> = ({ record, blobUrl, showSpinner, isGenerating, onClose, inline }) => {

    const fullName = record
        ? [record.LNAME, record.FNAME].filter(Boolean).join(', ')
        : '';

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden ${inline ? 'rounded-2xl h-full' : 'rounded-2xl w-full max-w-5xl max-h-[94vh]'}`}>

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="shrink-0 flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText size={16} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                            G6PD Report Preview
                        </p>
                        {record ? (
                            <>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
                                    {fullName || '—'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Lab No.{' '}
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                                        {record.LABNO}
                                    </span>
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-400 mt-0.5">No record selected</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                    {blobUrl && !showSpinner && (
                        <>
                            <a
                                href={blobUrl}
                                download="g6pd-report.pdf"
                                className="h-8 px-3 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 no-underline"
                            >
                                <Download size={12} />
                                Save PDF
                            </a>
                            <button
                                onClick={() => window.open(blobUrl, '_blank')}
                                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                                title="Open in new tab"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </>
                    )}
                    {/* Only show close X on modal mode */}
                    {!inline && (
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body — PDF only, full width ────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800/50 min-w-0">
                    {showSpinner ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <RefreshCw size={22} className="animate-spin text-blue-500" />
                            <p className="text-xs text-slate-400">
                                {isGenerating ? 'Generating report…' : 'Loading PDF…'}
                            </p>
                        </div>
                    ) : blobUrl ? (
                        <object
                            data={`${blobUrl}#toolbar=1&navpanes=0&zoom=page-width`}
                            type="application/pdf"
                            className="w-full flex-1"
                            style={{ minHeight: '480px' }}
                        >
                            <p className="text-xs text-slate-400 p-4">
                                PDF cannot be displayed.{' '}
                                <a href={blobUrl} download className="text-blue-500 underline">Download it</a> instead.
                            </p>
                        </object>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <FileText size={28} className="text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    No report available
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                                    Click <span className="font-semibold text-blue-600 dark:text-blue-400">View Report</span> on any record above
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="shrink-0 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                    {showSpinner ? 'Loading…' : blobUrl ? 'Ready' : 'Waiting for selection'}
                </span>
                {!inline && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Main export — modal or inline ───────────────────────────────────────────

export const G6PDReportModal: React.FC<G6PDReportModalProps> = ({
    record,
    reportUrl,
    isGenerating = false,
    onClose,
    inline = false,
}) => {
    const { blobUrl, loading: isFetchingBlob } = useBlobUrl(reportUrl);
    const showSpinner = isGenerating || isFetchingBlob;

    // ESC to close (modal mode only)
    useEffect(() => {
        if (inline || !record) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [record, onClose, inline]);

    // Inline mode — always rendered, no overlay
    if (inline) {
        return (
            <ReportContent
                record={record}
                blobUrl={blobUrl}
                showSpinner={showSpinner}
                isGenerating={isGenerating}
                onClose={onClose}
                inline={true}
            />
        );
    }

    // Modal mode — only render when a record is selected
    if (!record) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.80)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div onClick={e => e.stopPropagation()} className="w-full max-w-5xl max-h-[94vh] flex flex-col">
                <ReportContent
                    record={record}
                    blobUrl={blobUrl}
                    showSpinner={showSpinner}
                    isGenerating={isGenerating}
                    onClose={onClose}
                    inline={false}
                />
            </div>
        </div>
    );
};