import { Search, Plus, Folder, Upload, Grid3X3, List, Check } from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import type { ViewMode, ViewType } from './types';

interface CategoriesToolbarProps {
  currentView: ViewType;
  searchQuery: string;
  viewMode: ViewMode;
  isSelectMode: boolean;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAddCategory: () => void;
  onAddFolder: () => void;
  onUploadFiles: () => void;
  onEnterSelectMode: () => void;
}

export default function CategoriesToolbar({
  currentView,
  searchQuery,
  viewMode,
  isSelectMode,
  onSearchChange,
  onViewModeChange,
  onAddCategory,
  onAddFolder,
  onUploadFiles,
  onEnterSelectMode,
}: CategoriesToolbarProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={`Search ${currentView === 'categories' ? 'categories' : 'files and folders'}...`}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg border-gray-300 dark:border-gray-600">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {currentView === 'categories' ? (
            <button
              onClick={onAddCategory}
              disabled={!hasPermission(CategoryPermissions.ADD)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasPermission(CategoryPermissions.ADD)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onAddFolder}
                disabled={!hasPermission(CategoryPermissions.CREATE_FOLDER)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  hasPermission(CategoryPermissions.CREATE_FOLDER)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              >
                <Folder className="w-4 h-4" /> New Folder
              </button>
              <button
                onClick={onUploadFiles}
                disabled={!hasPermission(CategoryPermissions.UPLOAD_FILES)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  hasPermission(CategoryPermissions.UPLOAD_FILES)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload Files
              </button>
              {!isSelectMode && (
                <button
                  onClick={onEnterSelectMode}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Check className="w-4 h-4" /> Select
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
