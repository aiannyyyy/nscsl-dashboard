import { Download, File, Share2, Star, Trash2, X } from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import { getFileTypeIcon, isAudioFile, isFileOwner, isImageFile, isPDFFile, isTextFile, isVideoFile } from './utils';
import type { FileItem } from './types';

interface FileViewerModalProps {
  file: FileItem;
  currentUserId: string;
  previewBaseUrl: string;
  onClose: () => void;
  onStarFile: (e: React.MouseEvent, file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
}

export default function FileViewerModal({
  file,
  currentUserId,
  previewBaseUrl,
  onClose,
  onStarFile,
  onShareFile,
  onDownloadFile,
  onDeleteFile,
}: FileViewerModalProps) {
  const { hasPermission } = useCategoryPermissions();
  const previewUrl = `${previewBaseUrl}/${file.id}/download?user_id=${currentUserId}&preview=true`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1a1a' }}>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
            {getFileTypeIcon(file.file_type)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-white leading-tight">{file.name}</p>
            <p className="text-xs text-gray-400 leading-tight">
              {file.formatted_size} • {file.file_type.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
          <button
            onClick={e => onStarFile(e, file)}
            title={file.is_starred ? 'Remove from Starred' : 'Add to Starred'}
            className={`p-2 rounded-lg transition-colors ${
              file.is_starred
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
            }`}
          >
            <Star className={`w-5 h-5 ${file.is_starred ? 'fill-current' : ''}`} />
          </button>

          {hasPermission(CategoryPermissions.SHARE_FILES) && isFileOwner(file, currentUserId) && (
            <button
              onClick={() => onShareFile(file)}
              title="Share"
              className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}

          {hasPermission(CategoryPermissions.DOWNLOAD_FILES) && (
            <button
              onClick={() => onDownloadFile(file)}
              title="Download"
              className="p-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-gray-700 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {hasPermission(CategoryPermissions.DELETE_FILE) && (
            <button
              onClick={() => { onClose(); onDeleteFile(file); }}
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
        <span>By: <span className="text-gray-300 font-medium">{file.created_by_name || 'Unknown'}</span></span>
        <span>Downloads: <span className="text-gray-300 font-medium">{file.download_count}</span></span>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-700 flex items-center justify-center">
        {isImageFile(file.file_type) ? (
          <img src={previewUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
        ) : isPDFFile(file.file_type) ? (
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full border-0"
            title={file.name}
          />
        ) : isVideoFile(file.file_type) ? (
          <video controls className="max-w-full max-h-full" src={previewUrl}>
            Your browser does not support video.
          </video>
        ) : isAudioFile(file.file_type) ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
            <audio controls className="w-full" src={previewUrl}>
              Your browser does not support audio.
            </audio>
          </div>
        ) : isTextFile(file.file_type) ? (
          <iframe src={previewUrl} className="w-full h-full border-0 bg-white" title={file.name} />
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <File className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Preview Not Available</h4>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">This file type cannot be previewed in the browser.</p>
            {hasPermission(CategoryPermissions.DOWNLOAD_FILES) && (
              <button
                onClick={() => onDownloadFile(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" /> Download to View
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
