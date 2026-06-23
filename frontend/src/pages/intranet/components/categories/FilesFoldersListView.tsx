import {
  Clock, Download, Edit3, Folder, Move, Share2, Star, StarOff, Trash2,
} from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import { formatDate, getFileTypeIcon, isFileOwner } from './utils';
import type { FileItem, Folder as FolderType, MoveItem } from './types';

interface FilesFoldersListViewProps {
  folders: FolderType[];
  files: FileItem[];
  currentUserId: string;
  isSelectMode: boolean;
  selectedFiles: number[];
  selectedFolders: number[];
  onFolderClick: (folder: FolderType) => void;
  onFileClick: (file: FileItem) => void;
  onToggleFolderSelection: (id: number) => void;
  onToggleFileSelection: (id: number) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onMoveItem: (item: MoveItem) => void;
  onStarFile: (e: React.MouseEvent, file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onOpenVersionHistory: (file: FileItem) => void;
}

export default function FilesFoldersListView({
  folders,
  files,
  currentUserId,
  isSelectMode,
  selectedFiles,
  selectedFolders,
  onFolderClick,
  onFileClick,
  onToggleFolderSelection,
  onToggleFileSelection,
  onEditFolder,
  onDeleteFolder,
  onMoveItem,
  onStarFile,
  onShareFile,
  onDownloadFile,
  onDeleteFile,
  onOpenVersionHistory,
}: FilesFoldersListViewProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {['Name', 'Type', 'Size', 'Created', 'Created By', ''].map((h, i) => (
              <th
                key={i}
                className={`text-left p-4 font-medium text-gray-700 dark:text-gray-300 ${i === 5 ? 'w-12' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {folders.map(folder => (
            <tr
              key={`folder-${folder.id}`}
              onClick={() => !isSelectMode && onFolderClick(folder)}
              className="transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedFolders.includes(folder.id)}
                      onChange={() => onToggleFolderSelection(folder.id)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <div
                    className="p-2 rounded-lg cursor-pointer bg-yellow-50 dark:bg-gray-600"
                    onClick={() => !isSelectMode && onFolderClick(folder)}
                  >
                    <Folder className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div
                    className="font-medium cursor-pointer text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => !isSelectMode && onFolderClick(folder)}
                  >
                    {folder.name}
                  </div>
                </div>
              </td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">Folder</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">—</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(folder.created_at)}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{folder.created_by_name || 'Unknown'}</td>
              <td className="p-4">
                {!isSelectMode && (
                  <div className="flex items-center gap-1">
                    {hasPermission(CategoryPermissions.EDIT_FOLDER) && (
                      <button
                        onClick={() => onEditFolder(folder)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit3 className="w-4 h-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                      </button>
                    )}
                    {hasPermission(CategoryPermissions.DELETE_FOLDER) && (
                      <button
                        onClick={() => onDeleteFolder(folder)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                      </button>
                    )}
                    {String(folder.created_by) === String(currentUserId) && (
                      <button
                        onClick={() => onMoveItem({ id: folder.id, name: folder.name, type: 'folder' })}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Move"
                      >
                        <Move className="w-4 h-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}

          {files.map(file => (
            <tr
              key={`file-${file.id}`}
              className="transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => !isSelectMode && onFileClick(file)}
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => onToggleFileSelection(file.id)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-gray-600">{getFileTypeIcon(file.file_type)}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate max-w-xs text-gray-900 dark:text-white">{file.name}</div>
                    {file.is_starred && <Star className="w-4 h-4 text-yellow-600 fill-current" />}
                  </div>
                </div>
              </td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{file.file_type.toUpperCase()}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{file.formatted_size}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(file.created_at)}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{file.created_by_name || 'Unknown'}</td>
              <td className="p-4" onClick={e => e.stopPropagation()}>
                {!isSelectMode && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); onStarFile(e, file); }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      title={file.is_starred ? 'Unstar' : 'Star'}
                    >
                      {file.is_starred
                        ? <Star className="w-4 h-4 text-yellow-600 fill-current" />
                        : <StarOff className="w-4 h-4 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400" />}
                    </button>
                    {hasPermission(CategoryPermissions.SHARE_FILES) && isFileOwner(file, currentUserId) && (
                      <button
                        onClick={e => { e.stopPropagation(); e.preventDefault(); onShareFile(file); }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4 text-blue-500" />
                      </button>
                    )}
                    {hasPermission(CategoryPermissions.DOWNLOAD_FILES) && (
                      <button
                        onClick={e => { e.stopPropagation(); onDownloadFile(file); }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-400 hover:text-green-600 dark:hover:text-green-400" />
                      </button>
                    )}
                    {hasPermission(CategoryPermissions.DELETE_FILE) && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteFile(file); }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                      </button>
                    )}
                    {String(file.created_by) === String(currentUserId) && (
                      <button
                        onClick={e => { e.stopPropagation(); onMoveItem({ id: file.id, name: file.name, type: 'file' }); }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Move"
                      >
                        <Move className="w-4 h-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onOpenVersionHistory(file); }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Version History"
                    >
                      <Clock className="w-4 h-4 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
