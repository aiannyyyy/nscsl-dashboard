import { Edit, FolderPlus, X } from 'lucide-react';

interface CreateFolderModalProps {
  folderName: string;
  isCreating: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
}

export default function CreateFolderModal({
  folderName,
  isCreating,
  onClose,
  onNameChange,
  onCreate,
}: CreateFolderModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New Folder</h3>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Folder Name</label>
            <input
              type="text"
              value={folderName}
              onChange={e => onNameChange(e.target.value)}
              placeholder="Enter folder name…"
              onKeyPress={e => {
                if (e.key === 'Enter' && folderName.trim() && !isCreating) onCreate();
              }}
              disabled={isCreating}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={!folderName.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Creating…
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" /> Create
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
