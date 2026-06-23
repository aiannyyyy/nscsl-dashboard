import { File, FolderPlus, Upload } from 'lucide-react';

interface EmptyStateProps {
  searchQuery: string;
  isMainPage: boolean;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export default function EmptyState({
  searchQuery,
  isMainPage,
  onCreateFolder,
  onUpload,
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-12 text-center mt-6">
      <File className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
      <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">No files found</h3>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        {searchQuery
          ? 'Try adjusting your search terms.'
          : isMainPage
            ? 'Create folders to organize your files, then upload files inside them.'
            : 'Upload your first file to get started.'}
      </p>
      {isMainPage ? (
        <button
          onClick={onCreateFolder}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
        >
          <FolderPlus className="w-4 h-4" /> Create Folder
        </button>
      ) : (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
        >
          <Upload className="w-4 h-4" /> Upload Files
        </button>
      )}
    </div>
  );
}
