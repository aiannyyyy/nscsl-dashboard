import { CheckCircle, Filter, FolderPlus, Grid3X3, List, Search, Upload } from 'lucide-react';
import useFilePermissions, { FilePermissions } from './permissions';
import type { ViewMode } from './types';

interface FilesToolbarProps {
  searchQuery: string;
  viewMode: ViewMode;
  showFilters: boolean;
  filterType: string;
  filterTime: string;
  filterSize: string;
  isMainPage: boolean;
  isSelectMode: boolean;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterTypeChange: (value: string) => void;
  onFilterTimeChange: (value: string) => void;
  onFilterSizeChange: (value: string) => void;
  onOpenUpload: () => void;
  onToggleSelectMode: () => void;
  onOpenCreateFolder: () => void;
}

export default function FilesToolbar({
  searchQuery,
  viewMode,
  showFilters,
  filterType,
  filterTime,
  filterSize,
  isMainPage,
  isSelectMode,
  onSearchChange,
  onToggleFilters,
  onViewModeChange,
  onFilterTypeChange,
  onFilterTimeChange,
  onFilterSizeChange,
  onOpenUpload,
  onToggleSelectMode,
  onOpenCreateFolder,
}: FilesToolbarProps) {
  const { hasPermission } = useFilePermissions();

  return (
    <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-4 mb-6 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg border-gray-300 dark:border-gray-600">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-l-lg ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-r-lg ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {!isMainPage && hasPermission(FilePermissions.UPLOAD) && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          )}
          <button
            onClick={onToggleSelectMode}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              isSelectMode
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {isSelectMode ? 'Selecting' : 'Select'}
          </button>
          <button
            onClick={onOpenCreateFolder}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>
        </div>
      </div>
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <select
              value={filterType}
              onChange={e => onFilterTypeChange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="folders">Folders</option>
              <option value="documents">Documents</option>
              <option value="images">Images</option>
              <option value="pdfs">PDFs</option>
            </select>
            <select
              value={filterTime}
              onChange={e => onFilterTimeChange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 3 months</option>
            </select>
            <select
              value={filterSize}
              onChange={e => onFilterSizeChange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="all">All Sizes</option>
              <option value="under1mb">Less than 1MB</option>
              <option value="1to10mb">1MB – 10MB</option>
              <option value="over10mb">More than 10MB</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
