import { Clock, Download, Edit, Folder, Move, Share2, Star, Trash2, User } from 'lucide-react';
import useFilePermissions, { FilePermissions } from './permissions';
import { formatDate, formatFileSize, getFileIcon, isFileOwner } from './utils';
import type { FileItem, MoveItem } from './types';

interface FilesGridViewProps {
  items: FileItem[];
  currentUserId: string;
  isSelectMode: boolean;
  selectedFiles: string[];
  dragOverFolderId: string | null;
  onItemClick: (item: FileItem) => void;
  onToggleSelection: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: MoveItem) => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, folderId: string, folderName: string) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onToggleStar: (e: React.MouseEvent, file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (id: string) => void;
}

export default function FilesGridView({
  items,
  currentUserId,
  isSelectMode,
  selectedFiles,
  dragOverFolderId,
  onItemClick,
  onToggleSelection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onRename,
  onMove,
  onToggleStar,
  onShare,
  onDownload,
  onDelete,
}: FilesGridViewProps) {
  const { hasPermission } = useFilePermissions();

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {items.map(file => {
          const owned = isFileOwner(file, currentUserId);
          const draggable = !isSelectMode && owned;
          const isDragTarget = dragOverFolderId === file.id && file.type === 'folder';
          const isSelected = selectedFiles.includes(file.id);

          return (
            <div
              key={file.id}
              draggable={draggable}
              onDragStart={draggable ? e => onDragStart(e, { id: file.id, name: file.name!, type: file.type }) : undefined}
              onDragOver={!isSelectMode && file.type === 'folder' ? e => onDragOver(e, file.id) : undefined}
              onDragLeave={!isSelectMode && file.type === 'folder' ? onDragLeave : undefined}
              onDrop={!isSelectMode && file.type === 'folder' ? e => onDrop(e, file.id, file.name!) : undefined}
              onClick={() => onItemClick(file)}
              className={`relative group p-4 border rounded-lg transition-all cursor-pointer ${
                isDragTarget
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900 shadow-lg scale-105'
                  : isSelectMode && isSelected
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-400 dark:ring-blue-500'
                    : isSelectMode
                      ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-750'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            >
              {isSelectMode && (
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleSelection(file.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                </div>
              )}

              {!isSelectMode && (
                <div className="absolute top-1.5 inset-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5 flex-nowrap">
                  {owned && hasPermission(FilePermissions.RENAME) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onRename(file);
                      }}
                      title="Rename"
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {owned && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onMove(file);
                      }}
                      title="Move"
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {file.type === 'file' && (
                    <button
                      onClick={e => onToggleStar(e, file)}
                      title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        file.isStarred
                          ? 'text-yellow-400 hover:text-yellow-500'
                          : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {file.type === 'file' && owned && hasPermission(FilePermissions.SHARE) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        onShare(file);
                      }}
                      title="Share"
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {file.type === 'file' && hasPermission(FilePermissions.DOWNLOAD) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                      title="Download"
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasPermission(FilePermissions.DELETE) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(file.id);
                      }}
                      title="Delete"
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center text-center mt-8">
                <div className="w-12 h-12 mb-3 flex items-center justify-center">
                  {file.type === 'folder' ? (
                    <Folder className="w-10 h-10 text-blue-500" />
                  ) : (
                    <div className="relative">
                      {getFileIcon(file)}
                      {file.isStarred && (
                        <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-current" />
                      )}
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm mb-2 line-clamp-2 leading-tight text-gray-900 dark:text-white">
                  {file.name}
                </h3>
                <div className="text-xs space-y-1 text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(file.modifiedAt)}
                  </div>
                  {file.size && <div>{formatFileSize(file.size)}</div>}
                  <div className="flex items-center justify-center gap-1">
                    <User className="w-3 h-3" />
                    {file.modifiedBy}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
