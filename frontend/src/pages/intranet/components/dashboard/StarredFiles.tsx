import { Star, RefreshCw, Folder, User, Clock, Eye, Download } from 'lucide-react';
import { getFileTypeColor, formatFileSize, formatTimeAgo } from './utils';
import type { StarredFile } from './types';

interface StarredFilesProps {
  files: StarredFile[];
  loading: boolean;
  onRefresh: () => void;
  onPreview: (file: StarredFile) => void;
  onDownload: (file: StarredFile) => void;
}

export default function StarredFiles({
  files,
  loading,
  onRefresh,
  onPreview,
  onDownload,
}: StarredFilesProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Starred Files</h3>
          <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full">
            {files.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          title="Refresh starred files"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="h-80 overflow-y-auto overflow-x-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">Loading starred files...</span>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className="space-y-3 pr-1">
            {files.map((file) => (
              <div
                key={`${file.source_type}-${file.id}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {file.name || file.original_name}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Folder className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {file.category_name || 'Uncategorized'}
                          {file.folder_name ? ` / ${file.folder_name}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {file.created_by_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.file_type)}`}>
                          {file.file_type?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file_size)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Starred {formatTimeAgo(file.starred_at || file.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => onPreview(file)}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Preview file"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => onDownload(file)}
                      className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium">No starred files</p>
            <p className="text-sm mt-1">Star files to quickly access them here</p>
          </div>
        )}
      </div>
    </div>
  );
}