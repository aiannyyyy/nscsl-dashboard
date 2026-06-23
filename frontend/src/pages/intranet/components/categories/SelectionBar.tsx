import { Download, Move, Trash2, X } from 'lucide-react';
import type { ViewType } from './types';

interface SelectionBarProps {
  isSelectMode: boolean;
  currentView: ViewType;
  selectedFileCount: number;
  selectedFolderCount: number;
  isAllSelected: boolean;
  canDeleteSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMoveSelected: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onExitSelectMode: () => void;
}

export default function SelectionBar({
  isSelectMode,
  currentView,
  selectedFileCount,
  selectedFolderCount,
  isAllSelected,
  canDeleteSelected,
  onSelectAll,
  onClearSelection,
  onMoveSelected,
  onDownloadSelected,
  onDeleteSelected,
  onExitSelectMode,
}: SelectionBarProps) {
  const totalSelected = selectedFileCount + selectedFolderCount;
  const visible = isSelectMode && currentView === 'files-folders';

  return (
    <div className={`transition-all duration-200 overflow-hidden ${visible ? 'max-h-20 mb-4' : 'max-h-0 mb-0'}`}>
      <div className="rounded-xl border px-4 py-3 flex items-center gap-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 flex-shrink-0">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={e => (e.target.checked ? onSelectAll() : onClearSelection())}
            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {totalSelected > 0 ? `${totalSelected} selected` : 'Select all'}
          </span>
        </div>

        <div className="w-px h-5 flex-shrink-0 bg-gray-200 dark:bg-gray-600" />

        <div className="flex items-center gap-2 flex-1">
          {totalSelected > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onMoveSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Move className="w-3.5 h-3.5" /> Move
              </button>
              {selectedFileCount > 0 && (
                <button
                  onClick={onDownloadSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
              {canDeleteSelected && (
                <button
                  onClick={onDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Click items or use the checkbox above to select all
            </span>
          )}
        </div>

        <button
          onClick={onExitSelectMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors flex-shrink-0 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
