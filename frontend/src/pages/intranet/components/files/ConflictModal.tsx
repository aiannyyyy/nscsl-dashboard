import { AlertTriangle, CheckCircle, Copy, FileText, Layers, X } from 'lucide-react';
import type { ConflictItem, ConflictStrategy } from './types';

interface ConflictModalProps {
  pendingConflicts: ConflictItem[];
  conflictDecisions: Record<string, ConflictStrategy>;
  onClose: () => void;
  onApplyAll: (strategy: ConflictStrategy) => void;
  onApplyDecision: (itemId: string, strategy: ConflictStrategy) => void;
  onConfirm: () => void;
}

export default function ConflictModal({
  pendingConflicts,
  conflictDecisions,
  onClose,
  onApplyAll,
  onApplyDecision,
  onConfirm,
}: ConflictModalProps) {
  const undecidedCount = pendingConflicts.filter(c => !conflictDecisions[c.id]).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                {pendingConflicts.length} Naming Conflict{pendingConflicts.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">These files already exist at the destination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {pendingConflicts.length > 1 && (
          <div className="px-6 py-3 border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs mr-1 text-gray-500 dark:text-gray-400">Apply to all:</span>
              {(['overwrite', 'version', 'skip'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => onApplyAll(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    s === 'overwrite'
                      ? 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800'
                      : s === 'version'
                        ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s === 'overwrite' ? 'Overwrite all' : s === 'version' ? 'Version all' : 'Skip all'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {pendingConflicts.map(conflict => {
            const decided = conflictDecisions[conflict.id];
            return (
              <div
                key={conflict.id}
                className="rounded-xl border p-4 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{conflict.name}</p>
                    <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">Already exists at destination</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'overwrite' as const, label: 'Overwrite', icon: <Copy className="w-4 h-4" />, active: 'bg-red-600 text-white border-red-600' },
                    { key: 'version' as const, label: 'New version', icon: <Layers className="w-4 h-4" />, active: 'bg-blue-600 text-white border-blue-600' },
                    { key: 'skip' as const, label: 'Skip', icon: <X className="w-4 h-4" />, active: 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-600' },
                  ]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => onApplyDecision(conflict.id, s.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                        decided === s.key
                          ? s.active
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {s.icon}
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
                {decided && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    ✓{' '}
                    {decided === 'overwrite'
                      ? 'Replace existing. Previous version saved.'
                      : decided === 'version'
                        ? 'Keep both as versions.'
                        : "This file won't be moved."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={undecidedCount > 0}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {undecidedCount > 0 ? (
              `${undecidedCount} left to decide`
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Confirm Move
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
