import { Loader, RotateCcw, Trash2, X } from 'lucide-react';
import type { FileItem, FileVersion } from './types';

interface VersionHistoryModalProps {
  file: FileItem;
  versions: FileVersion[];
  loading: boolean;
  onClose: () => void;
  onRestoreVersion: (fileId: number, versionId: number) => void;
  onDeleteVersion: (fileId: number, versionId: number) => void;
}

export default function VersionHistoryModal({
  file,
  versions,
  loading,
  onClose,
  onRestoreVersion,
  onDeleteVersion,
}: VersionHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Version History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{file.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No previous versions found.</p>
          ) : (
            versions.map(v => (
              <div
                key={v.id}
                className="p-3 rounded-lg border mb-3 border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    Version {v.version_number}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRestoreVersion(file.id, v.id)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                    <button
                      onClick={() => onDeleteVersion(file.id, v.id)}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{v.file_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(v.saved_at).toLocaleString()} · by {v.saved_by}
                </p>
                {v.notes && (
                  <p className="text-xs mt-1 italic text-gray-400 dark:text-gray-500">{v.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
