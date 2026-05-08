import React, { useState } from "react";
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Printer, Download, Maximize2 } from "lucide-react";

interface PDFViewerProps {
  pdfUrl?: string;
  title?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  title = "Report Preview",
}) => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText size={14} className="text-blue-500 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Page nav */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-1.5 py-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 px-1 min-w-[48px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-1.5 py-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 10, 50))}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="text-[11px] font-medium text-gray-600 dark:text-gray-400 px-1 min-w-[40px] text-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {zoom}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(z + 10, 200))}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          <button className="h-8 px-3 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5">
            <Printer size={12} />
            Print
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              download
              className="h-8 px-3 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 no-underline"
            >
              <Download size={12} />
              Save
            </a>
          )}

          <button className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Content — flex-1 so it fills remaining card height */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center p-6 min-h-0">
        {pdfUrl ? (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="transition-transform duration-150 shadow-2xl"
          >
            <iframe
              src={`${pdfUrl}#page=${currentPage}`}
              className="bg-white"
              style={{ width: "595px", height: "842px", border: "none", display: "block" }}
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <FileText size={28} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No report generated</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                Select a patient and click{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">Generate Report</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex-shrink-0">
        <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-widest">
          {pdfUrl ? `Page ${currentPage} of ${totalPages}  ·  Zoom ${zoom}%` : "Ready"}
        </span>
        {pdfUrl && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600">PDF · ver 20240712</span>
        )}
      </div>
    </div>
  );
};