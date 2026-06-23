import { Share2, RefreshCw, Search, X, User, Clock, Folder, Eye, Download, File } from 'lucide-react';
import { getFileTypeColor, formatFileSize, formatTimeAgo } from './utils';
import type { SharedFile } from './types';

interface SharedWithMeProps {
  files: SharedFile[];
  processedFiles: SharedFile[];
  loading: boolean;
  searchQuery: string;
  sortBy: 'recent' | 'name' | 'size';
  filterType: 'all' | 'pdf' | 'doc' | 'image';
  onRefresh: () => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: 'recent' | 'name' | 'size') => void;
  onFilterChange: (filter: 'all' | 'pdf' | 'doc' | 'image') => void;
  onPreview: (file: SharedFile) => void;
  onDownload: (file: SharedFile) => void;
  onViewAll: () => void;
}

export default function SharedWithMe({
  files,
  processedFiles,
  loading,
  searchQuery,
  sortBy,
  filterType,
  onRefresh,
  onSearchChange,
  onSortChange,
  onFilterChange,
  onPreview,
  onDownload,
  onViewAll,
}: SharedWithMeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shared With Me</h3>
          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
            {files.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 font-medium p-1 rounded hover:bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          title="Refresh shared files"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {files.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files or owners..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'recent' | 'name' | 'size')}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="recent">Sort: Recent</option>
              <option value="name">Sort: Name</option>
              <option value="size">Sort: Size</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => onFilterChange(e.target.value as 'all' | 'pdf' | 'doc' | 'image')}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Type: All</option>
              <option value="pdf">Type: PDF</option>
              <option value="doc">Type: Documents</option>
              <option value="image">Type: Images</option>
            </select>
          </div>
        </div>
      )}

      <div className="h-80 overflow-y-auto overflow-x-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">Loading shared files...</span>
          </div>
        )}

        {!loading && processedFiles.length > 0 && (
          <div className="space-y-3 pr-2">
            {processedFiles.slice(0, 10).map((file) => (
              <div
                key={`${file.source_type}-${file.id}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {file.file_name || file.original_name}
                      </h3>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            Owner: <span className="font-medium">{file.owner_name}</span>
                          </span>
                        </div>
                        {file.shared_by_name && file.shared_by_name !== file.owner_name && (
                          <div className="flex items-center gap-1">
                            <Share2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-gray-500">
                              Shared by:{' '}
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {file.shared_by_name}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(file.file_type)}`}>
                            {file.file_type?.toUpperCase()}
                          </span>
                          <span className="text-gray-500">{formatFileSize(file.file_size)}</span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(file.shared_at)}
                          </span>
                        </div>
                        {file.category_name && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Folder className="w-3 h-3" />
                            <span className="truncate">{file.category_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => onPreview(file)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Preview file"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => onDownload(file)}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
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

        {!loading && processedFiles.length === 0 && files.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">No files match your filter</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center">
            <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No shared files</p>
            <p className="text-sm mt-1">Files shared with you will appear here</p>
          </div>
        )}
      </div>

      {processedFiles.length > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            View All Shared Files ({files.length})
          </button>
        </div>
      )}
    </div>
  );
}