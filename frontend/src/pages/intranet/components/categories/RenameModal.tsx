import { AlertCircle, Loader, X } from 'lucide-react';

interface RenameModalProps {
  fileName: string;
  modalError: string;
  submitting: boolean;
  onFileNameChange: (name: string) => void;
  onClose: () => void;
  onRename: () => void;
  onEnterKey: () => void;
}

export default function RenameModal({
  fileName,
  modalError,
  submitting,
  onFileNameChange,
  onClose,
  onRename,
  onEnterKey,
}: RenameModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rename File</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        {modalError && (
          <div className="mb-4 p-3 border rounded-lg flex items-center gap-2 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{modalError}</span>
          </div>
        )}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">New File Name</label>
          <input
            type="text"
            value={fileName}
            onChange={e => onFileNameChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onEnterKey(); }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
            placeholder="Enter new file name"
            autoFocus
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onRename}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />} Rename
          </button>
        </div>
      </div>
    </div>
  );
}
