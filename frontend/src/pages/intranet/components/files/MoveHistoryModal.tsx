import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  File,
  Folder,
  History,
  Loader,
  Move,
  RotateCcw,
  Undo2,
  X,
} from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900">
              <History className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">Move History</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last {history.length} move{history.length !== 1 ? 's' : ''} — undoable within 24 hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-gray-500 dark:text-gray-400">Loading history…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No move history yet</p>
              <p className="text-sm mt-1">Your moves will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(batch => {
                const isExpanded = expandedBatch === batch.batch_id;
                const movedAt = new Date(batch.moved_at);
                return (
                  <div
                    key={batch.batch_id}
                    className="rounded-xl border overflow-hidden border-gray-200 dark:border-gray-700"
                  >
                    <div
                      onClick={() => onToggleBatch(batch.batch_id)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          batch.undone
                            ? 'bg-gray-200 dark:bg-gray-700'
                            : batch.can_undo
                              ? 'bg-blue-100 dark:bg-blue-900'
                              : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        {batch.undone ? (
                          <RotateCcw className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Move className={`w-4 h-4 ${batch.can_undo ? 'text-blue-500' : 'text-gray-400'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Moved {batch.item_count} item{batch.item_count !== 1 ? 's' : ''}
                          </p>
                          {batch.undone && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              Undone
                            </span>
                          )}
                          {batch.can_undo && !batch.undone && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              Can undo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-0.5 text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {movedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                          at {movedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {batch.can_undo && (
                            <span className="text-blue-400">· expires in {batch.expires_in}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {batch.can_undo && !batch.undone && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onUndo(batch.batch_id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Undo
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {batch.items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900"
                          >
                            {item.item_type === 'folder' ? (
                              <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            ) : (
                              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-sm flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">
                              {item.item_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs flex-shrink-0 text-gray-400 dark:text-gray-500">
                              <span className="truncate max-w-[80px]">{item.from_folder}</span>
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[80px]">{item.to_folder}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
