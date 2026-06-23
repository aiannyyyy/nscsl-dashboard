import { ChevronRight, File, Folder, Loader, RotateCcw, X } from 'lucide-react';
import type { MoveHistoryBatch } from './types';

interface MoveHistoryModalProps {
  history: MoveHistoryBatch[];
  loading: boolean;
  expandedBatch: string | null;
  onClose: () => void;
  onToggleBatch: (batchId: string) => void;
  onUndo: (batchId: string) => void;
}

export default function MoveHistoryModal({
  history,
  loading,
  expandedBatch,
  onClose,
  onToggleBatch,
  onUndo,
}: MoveHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Move History</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No move history yet.</p>
          ) : (
            history.map(batch => (
              <div
                key={batch.batch_id}
                className="mb-3 border rounded-lg overflow-hidden border-gray-200 dark:border-gray-600"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => onToggleBatch(batch.batch_id)}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {batch.item_count} item(s) moved
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(batch.moved_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {batch.can_undo && (
                      <button
                        onClick={e => { e.stopPropagation(); onUndo(batch.batch_id); }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        <RotateCcw className="w-3 h-3" /> Undo
                      </button>
                    )}
                    {batch.undone && <span className="text-xs text-gray-400">Undone</span>}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        expandedBatch === batch.batch_id ? 'rotate-90' : ''
                      } text-gray-500 dark:text-gray-400`}
                    />
                  </div>
                </div>
                {expandedBatch === batch.batch_id && (
                  <div className="bg-white dark:bg-gray-800">
                    {batch.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-4 py-2 text-xs border-t border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                      >
                        {item.item_type === 'folder'
                          ? <Folder className="w-3 h-3 text-yellow-500" />
                          : <File className="w-3 h-3 text-blue-500" />}
                        <span className="flex-1 truncate">{item.item_name}</span>
                        <span>{item.from_folder} → {item.to_folder}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
