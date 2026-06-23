import { File, Folder, FolderPlus, Home, Loader, X } from 'lucide-react';
import MoveTreeNode from './MoveTreeNode';
import type { Category, ConflictItem, FolderNode, MoveItem } from './types';

interface MoveModalProps {
  moveItems: MoveItem[];
  moveTargetCategoryId: number | null;
  moveTargetFolderId: string | null;
  moveTargetFolderName: string;
  allCategories: Category[];
  folderTree: FolderNode[];
  movePreviewConflicts: ConflictItem[];
  moveLoading: boolean;
  showInlineFolderCreate: boolean;
  inlineFolderName: string;
  onClose: () => void;
  onCategoryChange: (categoryId: number) => void;
  onSelectDestination: (folderId: string | null, folderName: string, categoryId: number) => void;
  onToggleInlineFolderCreate: () => void;
  onInlineFolderNameChange: (name: string) => void;
  onCreateInlineFolder: () => void;
  onCancelInlineFolderCreate: () => void;
  onConfirmMove: () => void;
}

export default function MoveModal({
  moveItems,
  moveTargetCategoryId,
  moveTargetFolderId,
  moveTargetFolderName,
  allCategories,
  folderTree,
  movePreviewConflicts,
  moveLoading,
  showInlineFolderCreate,
  inlineFolderName,
  onClose,
  onCategoryChange,
  onSelectDestination,
  onToggleInlineFolderCreate,
  onInlineFolderNameChange,
  onCreateInlineFolder,
  onCancelInlineFolderCreate,
  onConfirmMove,
}: MoveModalProps) {
  const folderMoveIds = moveItems.filter(i => i.type === 'folder').map(i => i.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Move {moveItems.length} item(s)
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={moveTargetCategoryId || ''}
              onChange={e => onCategoryChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              {allCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destination Folder</label>
              <button
                onClick={onToggleInlineFolderCreate}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <FolderPlus className="w-3 h-3" /> New Folder
              </button>
            </div>

            {showInlineFolderCreate && (
              <div className="flex gap-2 mb-3">
                <input
                  value={inlineFolderName}
                  onChange={e => onInlineFolderNameChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onCreateInlineFolder();
                    if (e.key === 'Escape') onCancelInlineFolderCreate();
                  }}
                  placeholder={`New folder inside "${moveTargetFolderName}"`}
                  autoFocus
                  className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={onCreateInlineFolder}
                  disabled={!inlineFolderName.trim()}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={onCancelInlineFolderCreate}
                  className="px-2 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => moveTargetCategoryId && onSelectDestination(null, 'Home (root)', moveTargetCategoryId)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 text-sm ${
                moveTargetFolderId === null
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Home className="w-4 h-4" /> Home (root)
            </button>

            {folderTree.map(folder => (
              <MoveTreeNode
                key={folder.id}
                folder={folder}
                depth={0}
                selectedFolderId={moveTargetFolderId}
                moveItemIds={folderMoveIds}
                onSelect={onSelectDestination}
              />
            ))}
          </div>

          {movePreviewConflicts.length > 0 && (
            <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-medium mb-1 text-yellow-800 dark:text-yellow-300">
                ⚠️ {movePreviewConflicts.length} conflict(s) detected
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                You&apos;ll be asked how to handle them on the next step.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Moving</label>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
              {moveItems.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 border-gray-100 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  {item.type === 'folder'
                    ? <Folder className="w-4 h-4 text-yellow-500" />
                    : <File className="w-4 h-4 text-blue-500" />}
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3 justify-end border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmMove}
            disabled={moveLoading || moveTargetCategoryId === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {moveLoading && <Loader className="w-4 h-4 animate-spin" />} Move Here
          </button>
        </div>
      </div>
    </div>
  );
}
