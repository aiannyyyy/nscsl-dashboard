import { X, Download, File, Star } from 'lucide-react';
import { getFileIcon, formatFileSize, formatTimeAgo, canPreviewFile } from './utils';

interface FilePreviewModalProps {
  /** Discriminator so the modal knows which UI variant to render */
  variant: 'starred' | 'shared';

  // ── Shared fields ──────────────────────────────────────────────
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl: string;

  // ── Metadata shown in the meta-strip ──────────────────────────
  /** e.g. category name (starred) or owner name (shared) */
  metaLabel: string;
  metaValue: string;
  /** e.g. starred_at or shared_at */
  metaDate: string;

  // ── Extra info shown in the top-bar subtitle ──────────────────
  /** e.g. "By John Doe" (starred) or empty string (shared) */
  subtitle?: string;

  // ── State ─────────────────────────────────────────────────────
  loading: boolean;

  // ── Callbacks ─────────────────────────────────────────────────
  onClose: () => void;
  onDownload: () => void;
  onLoadEnd: () => void;
}

export default function FilePreviewModal({
  variant,
  fileName,
  fileType,
  fileSize,
  previewUrl,
  metaLabel,
  metaValue,
  metaDate,
  subtitle,
  loading,
  onClose,
  onDownload,
  onLoadEnd,
}: FilePreviewModalProps) {
  const ft = fileType?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ft);
  const isPdf = ft === 'pdf';
  const isText = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ft);
  const previewable = canPreviewFile(fileType);

  const renderAccentIcon = () =>
    variant === 'starred' ? (
      <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center flex-shrink-0">
        <Star className="w-4 h-4 text-white fill-current" />
      </div>
    ) : (
      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
        {getFileIcon(fileType)}
      </div>
    );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <span className="text-gray-300 font-medium">Loading preview...</span>
        </div>
      );
    }

    if (!previewable) {
      return (
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <File className="w-10 h-10 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Preview Not Available</h4>
          <p className="text-gray-400 text-sm mb-6">This file type cannot be previewed in the browser.</p>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" /> Download to View
          </button>
        </div>
      );
    }

    if (isImage) {
      return (
        <img
          src={previewUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          onLoad={onLoadEnd}
          onError={onLoadEnd}
        />
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={fileName}
          onLoad={onLoadEnd}
        />
      );
    }

    if (isText) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title={fileName}
          onLoad={onLoadEnd}
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#1a1a1a' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {renderAccentIcon()}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-white leading-tight">{fileName}</p>
            <p className="text-xs text-gray-400 leading-tight">
              {formatFileSize(fileSize)} • {fileType?.toUpperCase()}
              {subtitle ? ` • ${subtitle}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
          <button
            onClick={onDownload}
            title="Download"
            className="p-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-gray-700 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-xs text-gray-400 flex-shrink-0 border-b border-gray-700">
        <span>
          {metaLabel}:{' '}
          <span className="text-gray-300 font-medium">{metaValue}</span>
        </span>
        <span>{formatTimeAgo(metaDate)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-700 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}