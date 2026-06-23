import { Share2, X, User, HardDrive, Clock, Folder, Eye, Download } from 'lucide-react';
import { getFileIcon, getFileTypeColor, formatFileSize, formatTimeAgo } from './utils';
import type { SharedFile } from './types';

interface AllSharedFilesModalProps {
  files: SharedFile[];
  totalCount: number;
  onClose: () => void;
  onPreview: (file: SharedFile) => void;
  onDownload: (file: SharedFile) => void;
}

export default function AllSharedFilesModal({
  files,
  totalCount,
  onClose,
  onPreview,
  onDownload,
}: AllSharedFilesModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Shared Files</h2>
              <p className="text-sm text-gray-500">{files.length} files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {files.length > 0 ? (
              files.map((file) => (
                <div
                  key={`${file.source_type}-${file.id}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                          {file.file_name || file.original_name}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{file.owner_name}</span>
                            {file.owner_email && (
                              <span className="text-gray-400">({file.owner_email})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-4 h-4 text-gray-400" />
                              {formatFileSize(file.file_size)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFileTypeColor(file.file_type)}`}>
                              {file.file_type?.toUpperCase()}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-4 h-4" />
                              {formatTimeAgo(file.shared_at)}
                            </span>
                          </div>
                          {file.category_name && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Folder className="w-4 h-4" />
                              <span>{file.category_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { onClose(); onPreview(file); }}
                        className="p-3 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Preview file"
                      >
                        <Eye className="w-5 h-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => onDownload(file)}
                        className="p-3 hover:bg-green-100 rounded-lg transition-colors"
                        title="Download file"
                      >
                        <Download className="w-5 h-5 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-lg">No shared files</p>
                <p className="text-sm mt-1">Files shared with you will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {files.length} of {totalCount} files
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}