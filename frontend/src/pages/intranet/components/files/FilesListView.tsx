import {
  ArrowUpDown,
  Calendar,
  Download,
  Edit,
  Move,
  Share2,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import useFilePermissions, { FilePermissions } from './permissions';
import { formatDate, formatFileSize, getFileIcon, isFileOwner } from './utils';
import type { FileItem, MoveItem, SortColumn } from './types';

interface FilesListViewProps {
  items: FileItem[];
  currentUserId: string;
  isSelectMode: boolean;
  selectedFiles: string[];
  dragOverFolderId: string | null;
  onItemClick: (item: FileItem) => void;
  onSort: (col: SortColumn) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
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

export default function FilesListView({
  items,
  currentUserId,
  isSelectMode,
  selectedFiles,
  dragOverFolderId,
  onItemClick,
  onSort,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
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
}: FilesListViewProps) {
  const { hasPermission } = useFilePermissions();
  const isAllSelected = selectedFiles.length === items.length && items.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            <th className="w-10 p-3">
              {isSelectMode && (
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={e => (e.target.checked ? onSelectAll() : onClearSelection())}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              )}
            </th>
            {([
              ['name', 'Name'],
              ['date', 'Modified'],
              ['size', 'Size'],
            ] as const).map(([col, label]) => (
              <th key={col} className="text-left p-3">
                <button
                  onClick={() => onSort(col)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {label} <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
            ))}
            <th className="w-16 p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(file => {
            const owned = isFileOwner(file, currentUserId);
            const draggable = !isSelectMode && owned;
            const isDragTarget = dragOverFolderId === file.id && file.type === 'folder';
            const isSelected = selectedFiles.includes(file.id);

            return (
              <tr
                key={file.id}
                onClick={() => onItemClick(file)}
                draggable={draggable}
                onDragStart={draggable ? e => onDragStart(e, { id: file.id, name: file.name!, type: file.type }) : undefined}
                onDragOver={!isSelectMode && file.type === 'folder' ? e => onDragOver(e, file.id) : undefined}
                onDragLeave={!isSelectMode && file.type === 'folder' ? onDragLeave : undefined}
                onDrop={!isSelectMode && file.type === 'folder' ? e => onDrop(e, file.id, file.name!) : undefined}
                className={`transition-colors cursor-pointer ${
                  isDragTarget
                    ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-inset ring-blue-400 dark:ring-blue-500'
                    : isSelected
                      ? 'bg-blue-50 dark:bg-blue-900'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <td className="p-3 w-10" onClick={e => e.stopPropagation()}>
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(file.id)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                      {file.isStarred && (
                        <Star className="w-4 h-4 text-yellow-400 fill-current" title="Starred" />
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {formatDate(file.modifiedAt)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-400" />
                    {file.modifiedBy}
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                  {file.size ? formatFileSize(file.size) : '—'}
                </td>
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {owned && hasPermission(FilePermissions.RENAME) && (
                      <button
                        onClick={() => onRename(file)}
                        title="Rename"
                        className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit className="w-4 h-4" />
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
                        <Move className="w-4 h-4" />
                      </button>
                    )}
                    {file.type === 'file' && (
                      <>
                        <button
                          onClick={e => onToggleStar(e, file)}
                          title={file.isStarred ? 'Remove from Starred Files' : 'Add to Starred Files'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            file.isStarred
                              ? 'text-yellow-400 hover:text-yellow-500'
                              : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${file.isStarred ? 'fill-current' : ''}`} />
                        </button>
                        {owned && hasPermission(FilePermissions.SHARE) && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              onShare(file);
                            }}
                            title="Share this file"
                            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission(FilePermissions.DOWNLOAD) && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDownload(file);
                            }}
                            title="Download"
                            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {hasPermission(FilePermissions.DELETE) && (
                      <button
                        onClick={() => onDelete(file.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
