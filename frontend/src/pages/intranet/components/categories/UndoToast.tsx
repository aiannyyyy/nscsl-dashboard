import { X } from 'lucide-react';
import type { UndoToastState } from './types';

interface UndoToastProps {
  toast: UndoToastState | null;
  onUndo: (batchId: string) => void;
  onDismiss: () => void;
}

export default function UndoToast({ toast, onUndo, onDismiss }: UndoToastProps) {
  if (!toast?.visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-xl">
      <span className="text-sm">{toast.message}</span>
      <button
        onClick={() => onUndo(toast.batchId)}
        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 rounded text-sm font-medium"
      >
        Undo
      </button>
      <button onClick={onDismiss} className="p-1 hover:bg-gray-700 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
