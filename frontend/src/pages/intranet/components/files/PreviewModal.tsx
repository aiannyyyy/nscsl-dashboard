import { Download, File, FileText, Share2, Star, Trash2, X } from 'lucide-react';
import { canPreviewFile, formatFileSize, isFileOwner } from './utils';
import type { FileItem } from './types';

interface PreviewModalProps {
  file: FileItem;
  previewLoading: boolean;
  previewBaseUrl: string;
  currentUserId: string;
  onClose: () => void;
  onPreviewLoad: () => void;
  onToggleStar: (e: React.MouseEvent, file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (id: string) => void;
}

export default function PreviewModal({
  file,
  previewLoading,
  previewBaseUrl,
  currentUserId,
  onClose,
  onPreviewLoad,
  onToggleStar,
  onShare,
  onDownload,
  onDelete,
}: PreviewModalProps) {
  const ft = file.fileType?.toLowerCase() || '';
  const previewUrl = `${previewBaseUrl}/${file.id}`;
  const owned = isFileOwner(file, currentUserId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className="w-full h-full flex flex-col bg-white dark:bg-gray-900"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-white leading-tight">{file.name}</p>
              <p className="text-xs text-gray-400 leading-tight">
                {file.size ? formatFileSize(file.size) : '—'} • {file.fileType?.toUpperCase() || 'FILE'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
            <button
              onClick={e => onToggleStar(e, file)}
              title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
              className={`p-2 rounded-lg transition-colors ${
                file.isStarred ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
              }`}
            >
              <Star className={`w-5 h-5 ${file.isStarred ? 'fill-current' : ''}`} />
            </button>

            {owned && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  onShare(file);
                }}
                title="Share"
                className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => onDownload(file)}
              title="Download"
              className="p-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-gray-700 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>

            {owned && (
              <button
                onClick={() => {
                  onDelete(file.id);
                  onClose();
                }}
                title="Delete"
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <div className="w-px h-5 bg-gray-600 mx-1" />

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-xs text-gray-400 flex-shrink-0 border-b border-gray-700">
          <span>
            By: <span className="text-gray-300 font-medium">{file.modifiedBy}</span>
          </span>
          <span>
            Downloads: <span className="text-gray-300 font-medium">{file.download_count ?? 0}</span>
          </span>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-700 flex items-center justify-center">
          {previewLoading && (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              <span className="text-sm text-gray-400">Loading preview…</span>
            </div>
          )}

          {canPreviewFile(file) ? (
            <>
              {['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ft) && (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                  onLoad={onPreviewLoad}
                  onError={onPreviewLoad}
                />
              )}

              {ft === 'pdf' && (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0"
                  onLoad={onPreviewLoad}
                  title={file.name}
                />
              )}

              {['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ft) && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  onLoad={onPreviewLoad}
                  title={file.name}
                />
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <File className="w-10 h-10 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Preview Not Available</h4>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">
                This file type cannot be previewed in the browser.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" /> Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
