import { Loader, X } from 'lucide-react';
import type { ConflictItem, ConflictStrategy } from './types';

interface ConflictModalProps {
  pendingConflicts: ConflictItem[];
  conflictDecisions: Record<number, ConflictStrategy>;
  moveLoading: boolean;
  onClose: () => void;
  onBack: () => void;
  onApplyAll: (strategy: ConflictStrategy) => void;
  onSetDecision: (conflictId: number, strategy: ConflictStrategy) => void;
  onConfirmMove: () => void;
}

export default function ConflictModal({
  pendingConflicts,
  conflictDecisions,
  moveLoading,
  onClose,
  onBack,
  onApplyAll,
  onSetDecision,
  onConfirmMove,
}: ConflictModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resolve Conflicts</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 mb-4 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Apply to all:</span>
            {(['overwrite', 'version', 'skip'] as const).map(s => (
              <button
                key={s}
                onClick={() => onApplyAll(s)}
                className="px-2 py-1 text-xs rounded border capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {s}
              </button>
            ))}
          </div>
          {pendingConflicts.map(conflict => (
            <div
              key={conflict.id}
              className="p-3 rounded-lg border mb-3 border-gray-200 dark:border-gray-600"
            >
              <p className="text-sm font-medium mb-2 text-gray-900 dark:text-white">&quot;{conflict.name}&quot;</p>
              <div className="flex gap-2">
                {(['overwrite', 'version', 'skip'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => onSetDecision(conflict.id, s)}
                    className={`px-3 py-1 text-xs rounded-lg capitalize ${
                      conflictDecisions[conflict.id] === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-3 justify-end border-gray-200 dark:border-gray-700">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Back
          </button>
          <button
            onClick={onConfirmMove}
            disabled={moveLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {moveLoading && <Loader className="w-4 h-4 animate-spin" />} Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
}
