import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';

export const getChatAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;

  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketUrl) {
    const base = socketUrl.replace(/\/$/, '');
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl.startsWith('http')) {
    return `${apiUrl.replace(/\/api\/?$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
  }

  return url;
};

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  isSent: boolean;
  messageType?: string;
}

const formatSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (fileType: string, fileName: string, messageType?: string) =>
  fileType?.startsWith('image/') ||
  messageType === 'image' ||
  /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName ?? '');

const isPdfFile = (fileType: string, fileName: string) =>
  fileType === 'application/pdf' || /\.pdf$/i.test(fileName ?? '');

export const FilePreview: React.FC<FilePreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  isSent,
  messageType,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const absoluteUrl = getChatAssetUrl(fileUrl);
  const isImage = isImageFile(fileType, fileName, messageType);
  const isPdf = isPdfFile(fileType, fileName);
  const sizeLabel = formatSize(fileSize);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isImage || isPdf) {
      setViewerOpen(true);
    } else {
      window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const FileIcon = isImage ? ImageIcon : FileText;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-xl max-w-[220px] w-full text-left transition-colors ${
          isSent
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
      >
        <FileIcon size={14} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          {sizeLabel && (
            <p className={`text-xs ${isSent ? 'text-white/70' : 'text-slate-400'}`}>
              {sizeLabel}
            </p>
          )}
        </div>
        <Download size={12} className="flex-shrink-0 opacity-60" />
      </button>

      {viewerOpen && (
        <FileViewerModal
          url={absoluteUrl}
          fileName={fileName}
          isImage={isImage}
          isPdf={isPdf}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
};

interface FileViewerModalProps {
  url: string;
  fileName: string;
  isImage: boolean;
  isPdf: boolean;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  url,
  fileName,
  isImage,
  isPdf,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="relative w-full max-w-3xl max-h-[90vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-sm text-white truncate flex-1 mr-3">{fileName}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Download"
          >
            <Download size={16} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {isImage ? (
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-[80vh] mx-auto rounded-lg object-contain"
        />
      ) : isPdf ? (
        <iframe
          src={url}
          title={fileName}
          className="w-full h-[80vh] rounded-lg bg-white"
        />
      ) : null}
    </div>
  </div>
);

/* Kept for backward compatibility */
export const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({
  src,
  alt,
  onClose,
}) => (
  <FileViewerModal
    url={getChatAssetUrl(src)}
    fileName={alt}
    isImage
    isPdf={false}
    onClose={onClose}
  />
);

export default FilePreview;
