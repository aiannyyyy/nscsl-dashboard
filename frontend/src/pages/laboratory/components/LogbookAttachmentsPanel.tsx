import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Download, Eye, FileText, Paperclip, X } from 'lucide-react';

export const parseLogbookAttachmentPaths = (attachmentCsv: string | null | undefined): string[] => {
  if (!attachmentCsv?.trim()) return [];
  return attachmentCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const apiAssetBaseUrl = (): string =>
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const downloadStoredFile = (filePath: string) => {
  const downloadUrl = `${apiAssetBaseUrl()}/${filePath.replace(/^\//, '')}`;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filePath.split('/').pop() || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

type Props = {
  note: string | null | undefined;
  attachmentPath: string | null | undefined;
};

/**
 * Shared "Note + Attachments" block for Logbook endorsement detail modals.
 *
 * FIX E-G: Both the list modal and file viewer are now rendered via
 * ReactDOM.createPortal into document.body. This escapes the parent
 * ViewDetailsModal's overflow:hidden container so they are never clipped.
 */
export const LogbookAttachmentsPanel: React.FC<Props> = ({ note, attachmentPath }) => {
  const files = useMemo(() => parseLogbookAttachmentPaths(attachmentPath ?? null), [attachmentPath]);
  const noteText = typeof note === 'string' ? note.trim() : '';
  const [listOpen, setListOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ path: string; name: string; type: string } | null>(null);

  const openViewer = (filePath: string) => {
    const trimmed = filePath.trim();
    const fileName = trimmed.split('/').pop() || 'Unknown file';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const downloadOnly = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'csv', 'zip', 'rar'];
    if (downloadOnly.includes(ext)) {
      downloadStoredFile(trimmed);
      return;
    }
    setViewingFile({ path: trimmed, name: fileName, type: ext });
  };

  if (!noteText && files.length === 0) return null;

  // ── FIX G: File viewer portalled to document.body ──────────────────────────
  const fileViewerOverlay =
    viewingFile &&
    typeof document !== 'undefined' &&
    ReactDOM.createPortal(
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4"
        role="presentation"
        onClick={() => setViewingFile(null)}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={20} className="text-blue-500 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {viewingFile.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{viewingFile.type.toUpperCase()} file</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadStoredFile(viewingFile.path)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
              >
                <Download size={14} />
                Download
              </button>
              <button
                type="button"
                onClick={() => setViewingFile(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4 flex items-center justify-center min-h-[200px]">
            {(() => {
              const fileUrl = `${apiAssetBaseUrl()}/${viewingFile.path.replace(/^\//, '')}`;
              const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
              if (imageTypes.includes(viewingFile.type)) {
                return (
                  <img
                    src={fileUrl}
                    alt={viewingFile.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow"
                  />
                );
              }
              if (viewingFile.type === 'pdf' || viewingFile.type === 'txt') {
                return (
                  <iframe
                    title={viewingFile.name}
                    src={fileUrl}
                    className="w-full min-h-[70vh] rounded-lg bg-white"
                  />
                );
              }
              return (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center px-4">
                  Preview is not available for this file type. Use Download.
                </p>
              );
            })()}
          </div>
        </div>
      </div>,
      document.body
    );

  // ── FIX F: List modal portalled to document.body ───────────────────────────
  const listModal =
    listOpen &&
    files.length > 0 &&
    typeof document !== 'undefined' &&
    ReactDOM.createPortal(
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
        role="presentation"
        onClick={() => setListOpen(false)}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logbook-att-list-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3
              id="logbook-att-list-title"
              className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <Paperclip className="w-4 h-4 text-indigo-500" />
              Attachments ({files.length})
            </h3>
            <button
              type="button"
              onClick={() => setListOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="overflow-y-auto p-3 space-y-2">
            {files.map((fp) => {
              const name = fp.split('/').pop() || fp;
              const ext = name.split('.').pop()?.toLowerCase() || '';
              return (
                <li
                  key={fp}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={name}>
                        {name}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">{ext || 'file'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openViewer(fp)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadStoredFile(fp)}
                      className="px-2.5 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {(noteText || files.length > 0) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded shrink-0" aria-hidden />
            Note &amp; attachments
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {noteText ? (
              <div className="bg-amber-50/80 dark:bg-amber-900/15 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <span className="text-xs uppercase tracking-wider font-semibold text-amber-800/80 dark:text-amber-200/90">
                  Note
                </span>
                <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">{noteText}</p>
              </div>
            ) : null}
            {files.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  View attachments ({files.length})
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* FIX F+G: Both modals are portalled — they render in document.body,
          completely outside the parent modal's overflow:hidden container */}
      {listModal}
      {fileViewerOverlay}
    </>
  );
};