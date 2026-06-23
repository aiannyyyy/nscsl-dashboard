import { Undo2, X, CheckCircle } from 'lucide-react';
import type { UndoToastState } from './types';

interface UndoToastProps {
  toast: UndoToastState | null;
  onUndo: (batchId: string) => void;
  onDismiss: () => void;
}

export default function UndoToast({ toast, onUndo, onDismiss }: UndoToastProps) {
  if (!toast?.visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900">
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
        <p className="flex-1 text-sm font-medium truncate">{toast.message}</p>
        <button
          onClick={() => onUndo(toast.batchId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg flex-shrink-0 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
