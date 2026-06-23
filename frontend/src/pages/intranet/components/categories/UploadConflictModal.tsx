import { X } from 'lucide-react';
import type { ConflictStrategy, UploadConflict } from './types';

interface UploadConflictModalProps {
  conflict: UploadConflict;
  submitting: boolean;
  onClose: () => void;
  onResolve: (strategy: ConflictStrategy) => void;
}

export default function UploadConflictModal({
  conflict,
  submitting,
  onClose,
  onResolve,
}: UploadConflictModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Already Exists</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
          <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">
            A file named <span className="font-semibold">&quot;{conflict.uploaded_file?.original_name}&quot;</span> already exists at this location.
          </p>
          <div className="text-xs space-y-1 text-gray-500 dark:text-gray-400">
            <div>Existing size: {((conflict.existing_file?.file_size || 0) / 1024).toFixed(1)} KB</div>
            <div>New file size: {((conflict.uploaded_file?.file_size || 0) / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <p className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">What would you like to do?</p>
        <div className="space-y-3">
          <button
            onClick={() => onResolve('overwrite')}
            disabled={submitting}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-left"
          >
            <div className="font-medium">Overwrite</div>
            <div className="text-xs opacity-80">Replace the existing file. Previous version will be saved.</div>
          </button>
          <button
            onClick={() => onResolve('version')}
            disabled={submitting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-left"
          >
            <div className="font-medium">Save as New Version</div>
            <div className="text-xs opacity-80">Keep both — new file saved with a version number.</div>
          </button>
          <button
            onClick={() => onResolve('skip')}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-lg disabled:opacity-50 text-left border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <div className="font-medium">Skip</div>
            <div className="text-xs opacity-60">Cancel this upload. Existing file unchanged.</div>
          </button>
        </div>
      </div>
    </div>
  );
}
