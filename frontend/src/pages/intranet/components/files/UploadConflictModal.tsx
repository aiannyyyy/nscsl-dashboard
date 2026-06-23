import { AlertTriangle, Copy, Layers, X } from 'lucide-react';
import type { ConflictStrategy, UploadConflict } from './types';

interface UploadConflictModalProps {
  conflict: UploadConflict;
  isUploading: boolean;
  onClose: () => void;
  onResolve: (strategy: ConflictStrategy) => void;
}

export default function UploadConflictModal({
  conflict,
  isUploading,
  onClose,
  onResolve,
}: UploadConflictModalProps) {
  const strategies = [
    {
      key: 'overwrite' as const,
      label: 'Overwrite',
      desc: 'Replace existing file',
      icon: <Copy className="w-5 h-5" />,
      color: 'text-red-500',
      hover: 'hover:bg-red-50 dark:hover:bg-red-900 hover:border-red-300 dark:hover:border-red-700',
    },
    {
      key: 'version' as const,
      label: 'New Version',
      desc: 'Save alongside as v2',
      icon: <Layers className="w-5 h-5" />,
      color: 'text-blue-500',
      hover: 'hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-700 dark:hover:border-blue-600',
    },
    {
      key: 'skip' as const,
      label: 'Skip',
      desc: "Don't upload this file",
      icon: <X className="w-5 h-5" />,
      color: 'text-gray-500',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">File Already Exists</h3>
              {conflict.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{conflict.message}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            How would you like to handle{' '}
            <span className="font-semibold">&quot;{conflict.uploaded_file.file_name}&quot;</span>?
          </p>
          <div className="grid grid-cols-3 gap-3">
            {strategies.map(s => (
              <button
                key={s.key}
                onClick={() => onResolve(s.key)}
                disabled={isUploading}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-50 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${s.hover}`}
              >
                <span className={s.color}>{s.icon}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.label}</span>
                <span className="text-xs text-center text-gray-500 dark:text-gray-400">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>
        {isUploading && (
          <div className="px-6 py-3 border-t flex items-center gap-2 border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Processing…</span>
          </div>
        )}
      </div>
    </div>
  );
}
