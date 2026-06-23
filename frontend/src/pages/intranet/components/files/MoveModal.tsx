import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Folder,
  FolderPlus,
  Home,
  Info,
  Loader,
  Move,
  X,
} from 'lucide-react';
import MoveTreeNode from './MoveTreeNode';
import type { FolderNode, MoveItem, MovePreview } from './types';

interface MoveModalProps {
  moveItems: MoveItem[];
  moveTargetFolderId: string | null;
  moveTargetFolderName: string;
  movePreview: MovePreview | null;
  movePreviewLoading: boolean;
  isMoving: boolean;
  folderTree: FolderNode[];
  folderTreeLoading: boolean;
  showInlineFolderCreate: boolean;
  inlineFolderName: string;
  isCreatingInlineFolder: boolean;
  onClose: () => void;
  onSelectDestination: (folderId: string | null, folderName: string) => void;
  onToggleFolderInTree: (folderId: string, folderName: string, isOpen: boolean) => void;
  onToggleInlineFolderCreate: () => void;
  onInlineFolderNameChange: (name: string) => void;
  onCreateInlineFolder: () => void;
  onCancelInlineFolderCreate: () => void;
  onExecuteMove: () => void;
}

export default function MoveModal({
  moveItems,
  moveTargetFolderId,
  moveTargetFolderName,
  movePreview,
  movePreviewLoading,
  isMoving,
  folderTree,
  folderTreeLoading,
  showInlineFolderCreate,
  inlineFolderName,
  isCreatingInlineFolder,
  onClose,
  onSelectDestination,
  onToggleFolderInTree,
  onToggleInlineFolderCreate,
  onInlineFolderNameChange,
  onCreateInlineFolder,
  onCancelInlineFolderCreate,
  onExecuteMove,
}: MoveModalProps) {
  const disabledIds = moveItems.filter(i => i.type === 'folder').map(i => i.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900">
              <Move className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                Move {moveItems.length === 1 ? `"${moveItems[0].name}"` : `${moveItems.length} items`}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {moveItems.filter(i => i.type === 'file').length} file(s),{' '}
                {moveItems.filter(i => i.type === 'folder').length} folder(s)
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

        <div className="px-6 py-3 border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Moving to:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              <Folder className="w-3.5 h-3.5" /> {moveTargetFolderName}
            </div>
          </div>
          {movePreviewLoading && (
            <div className="flex items-center gap-2 text-sm mt-3 text-gray-500 dark:text-gray-400">
              <Loader className="w-4 h-4 animate-spin" /> Checking destination…
            </div>
          )}
          {!movePreviewLoading && movePreview && (
            <div className="mt-3 space-y-2">
              {movePreview.can_move.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {movePreview.can_move.length} item{movePreview.can_move.length !== 1 ? 's' : ''} ready to move
                </div>
              )}
              {movePreview.conflicts.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {movePreview.conflicts.length} name conflict{movePreview.conflicts.length !== 1 ? 's' : ''} — you&apos;ll choose how to handle them next
                </div>
              )}
              {movePreview.errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300">
                  <X className="w-4 h-4 flex-shrink-0" /> {movePreview.errors[0]?.reason}
                </div>
              )}
              {movePreview.warnings.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                  <Info className="w-4 h-4 flex-shrink-0" /> {movePreview.warnings[0]?.reason}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3 px-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Select destination
            </p>
            <button
              onClick={onToggleInlineFolderCreate}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                showInlineFolderCreate
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Folder
            </button>
          </div>

          {showInlineFolderCreate && (
            <div className="mx-2 mb-3 p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
              <p className="text-xs mb-2 text-gray-500 dark:text-gray-400">
                Creating inside: <span className="font-medium">{moveTargetFolderName}</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inlineFolderName}
                  onChange={e => onInlineFolderNameChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && inlineFolderName.trim() && !isCreatingInlineFolder) onCreateInlineFolder();
                    if (e.key === 'Escape') onCancelInlineFolderCreate();
                  }}
                  placeholder="Folder name…"
                  autoFocus
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={onCreateInlineFolder}
                  disabled={!inlineFolderName.trim() || isCreatingInlineFolder}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingInlineFolder ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Create
                    </>
                  )}
                </button>
                <button
                  onClick={onCancelInlineFolderCreate}
                  className="p-1.5 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => onSelectDestination(null, 'Home (root)')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 ${
              moveTargetFolderId === null
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Home (root)</span>
          </div>

          {folderTreeLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
              <Loader className="w-4 h-4 animate-spin" /> Loading folders…
            </div>
          ) : (
            folderTree.map(node => (
              <MoveTreeNode
                key={node.id}
                node={node}
                selectedId={moveTargetFolderId}
                onSelect={onSelectDestination}
                onToggle={onToggleFolderInTree}
                disabledIds={disabledIds}
              />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onExecuteMove}
            disabled={isMoving || movePreviewLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isMoving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Moving…
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" /> Move here
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
