import React, { useState, useEffect } from "react";
import { FileText, Download, Maximize2, RefreshCw } from "lucide-react";
import api from "../../../services/api"; // axios instance — auth interceptor runs automatically

interface PDFViewerProps {
    reportUrl: string | null; // single URL replacing masterUrl + archiveUrl
    source?:   "master" | "archive" | null; // optional — shown as a badge
    isLoading: boolean;
}

const useBlobUrl = (url: string | null) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!url) {
            setBlobUrl(null);
            return;
        }

        let revoked = false;
        setLoading(true);

        api
            .get(url, { responseType: "blob" })
            .then(({ data: blob }) => {
                if (revoked) return;
                setBlobUrl(URL.createObjectURL(blob));
            })
            .catch((err) => {
                console.error("PDF fetch error:", err);
                setBlobUrl(null);
            })
            .finally(() => setLoading(false));

        return () => {
            revoked = true;
            setBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [url]);

    return { blobUrl, loading };
};

export const PDFViewer: React.FC<PDFViewerProps> = ({ reportUrl, source, isLoading }) => {
    const { blobUrl, loading: isFetchingBlob } = useBlobUrl(reportUrl);
    const showSpinner = isLoading || isFetchingBlob;
    const hasReport   = !!reportUrl;

    return (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex-shrink-0">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText size={14} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Report Preview
                    </span>

                    {/* Source badge — shows which .rpt was used */}
                    {hasReport && !showSpinner && source && (
                        <span className="ml-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] font-semibold text-blue-600 dark:text-blue-400 capitalize">
                            {source}
                        </span>
                    )}
                </div>

                {/* Toolbar — only when PDF is ready */}
                {hasReport && !showSpinner && blobUrl && (
                    <div className="flex items-center gap-1.5">
                        {/* Save */}
                        <a
                            href={blobUrl}
                            download="report.pdf"
                            className="h-8 px-3 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 no-underline"
                        >
                            <Download size={12} />
                            Save
                        </a>

                        {/* Open in new tab */}
                        <button
                            onClick={() => window.open(blobUrl, "_blank")}
                            className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                        >
                            <Maximize2 size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800/50 flex items-stretch min-h-0">
                {showSpinner ? (
                    <div className="flex flex-col items-center justify-center gap-3 w-full">
                        <RefreshCw size={22} className="animate-spin text-blue-500" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {isLoading ? "Generating report..." : "Loading PDF..."}
                        </p>
                    </div>
                ) : hasReport && blobUrl ? (
                    <div className="w-full h-full">
                        <object
                            data={`${blobUrl}#toolbar=1&navpanes=0&zoom=page-width`}
                            type="application/pdf"
                            className="w-full h-full bg-white rounded-lg shadow-lg"
                            style={{ minHeight: "600px" }}
                        >
                            <p className="text-xs text-gray-400 p-4">
                                PDF cannot be displayed.{" "}
                                <a href={blobUrl} download className="text-blue-500 underline">Download it</a> instead.
                            </p>
                        </object>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 w-full">
                        <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <FileText size={28} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No report generated</p>
                            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                                Select a patient and click{" "}
                                <span className="font-semibold text-blue-600 dark:text-blue-400">Print Preview</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Status bar ── */}
            <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex-shrink-0">
                <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                    {showSpinner ? "Loading..." : hasReport ? "Ready" : "Ready"}
                </span>
                {hasReport && !showSpinner && source && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 capitalize">
                        Source: {source}
                    </span>
                )}
            </div>

        </div>
    );
};