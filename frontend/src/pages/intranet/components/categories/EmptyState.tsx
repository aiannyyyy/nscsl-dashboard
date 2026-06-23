import { FileText, Folder, FolderOpen, Plus, Upload } from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import type { ViewType } from './types';

interface EmptyStateProps {
  currentView: ViewType;
  searchQuery: string;
  onAddCategory: () => void;
  onAddFolder: () => void;
  onUploadFiles: () => void;
}

export default function EmptyState({
  currentView,
  searchQuery,
  onAddCategory,
  onAddFolder,
  onUploadFiles,
}: EmptyStateProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-12 text-center mt-6">
      {currentView === 'categories' ? (
        <>
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">No categories found</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search terms.' : 'Create your first category to organize your files.'}
          </p>
          <button
            onClick={onAddCategory}
            disabled={!hasPermission(CategoryPermissions.ADD)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg mx-auto transition-colors ${
              hasPermission(CategoryPermissions.ADD)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </>
      ) : (
        <>
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">No files or folders found</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search terms.' : 'Create folders or upload files to get started.'}
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={onAddFolder}
              disabled={!hasPermission(CategoryPermissions.CREATE_FOLDER)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasPermission(CategoryPermissions.CREATE_FOLDER)
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Folder className="w-4 h-4" /> New Folder
            </button>
            <button
              onClick={onUploadFiles}
              disabled={!hasPermission(CategoryPermissions.UPLOAD_FILES)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasPermission(CategoryPermissions.UPLOAD_FILES)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload Files
            </button>
          </div>
        </>
      )}
    </div>
  );
}
