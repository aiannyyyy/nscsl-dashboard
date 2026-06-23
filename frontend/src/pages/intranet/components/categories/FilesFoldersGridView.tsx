import {
  Download, Edit3, Folder, Move, Share2, Star, StarOff, Trash2,
} from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import { formatDate, getFileTypeIcon, isFileOwner } from './utils';
import type { FileItem, Folder as FolderType, MoveItem } from './types';

interface FilesFoldersGridViewProps {
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
  onRenameFile: (file: FileItem) => void;
  onStarFile: (e: React.MouseEvent, file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
}

export default function FilesFoldersGridView({
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
  onRenameFile,
  onStarFile,
  onShareFile,
  onDownloadFile,
  onDeleteFile,
}: FilesFoldersGridViewProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="p-6 bg-white dark:bg-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {folders.map(folder => (
          <div
            key={`folder-${folder.id}`}
            onClick={() => isSelectMode && onToggleFolderSelection(folder.id)}
            className={`group relative border rounded-xl p-5 hover:shadow-md transition-all duration-200 cursor-pointer ${
              isSelectMode && selectedFolders.includes(folder.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {isSelectMode && (
              <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedFolders.includes(folder.id)}
                  onChange={() => onToggleFolderSelection(folder.id)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-lg ${isSelectMode ? 'ml-6' : ''} bg-yellow-50 dark:bg-gray-600`}
                onClick={() => !isSelectMode && onFolderClick(folder)}
              >
                <Folder className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              {!isSelectMode && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasPermission(CategoryPermissions.EDIT_FOLDER) && (
                    <button
                      onClick={e => { e.stopPropagation(); onEditFolder(folder); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                    </button>
                  )}
                  {hasPermission(CategoryPermissions.DELETE_FOLDER) && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteFolder(folder); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                    </button>
                  )}
                  {String(folder.created_by) === String(currentUserId) && (
                    <button
                      onClick={e => { e.stopPropagation(); onMoveItem({ id: folder.id, name: folder.name, type: 'folder' }); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Move"
                    >
                      <Move className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <h3
              className="font-semibold mb-1 group-hover:text-blue-600 cursor-pointer truncate text-gray-900 dark:text-white"
              onClick={() => !isSelectMode && onFolderClick(folder)}
            >
              {folder.name}
            </h3>
            <p className="text-sm mb-3 line-clamp-2 text-gray-600 dark:text-gray-400">{folder.description}</p>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-600">
              <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(folder.created_at)}</div>
              <div className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
                By <span className="font-medium">{folder.created_by_name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        ))}

        {files.map(file => (
          <div
            key={`file-${file.id}`}
            onClick={e => {
              if (isSelectMode) onToggleFileSelection(file.id);
              else onFileClick(file);
            }}
            className={`group relative border rounded-xl p-5 hover:shadow-md transition-all duration-200 cursor-pointer ${
              isSelectMode && selectedFiles.includes(file.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {isSelectMode && (
              <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => onToggleFileSelection(file.id)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${isSelectMode ? 'ml-6' : ''} bg-blue-50 dark:bg-gray-600`}>
                {getFileTypeIcon(file.file_type)}
              </div>
              {!isSelectMode && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasPermission(CategoryPermissions.EDIT) && (
                    <button
                      onClick={e => { e.stopPropagation(); onRenameFile(file); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Rename"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400" />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onStarFile(e, file); }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                    title={file.is_starred ? 'Unstar' : 'Star'}
                  >
                    {file.is_starred
                      ? <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      : <StarOff className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400" />}
                  </button>
                  {hasPermission(CategoryPermissions.SHARE_FILES) && isFileOwner(file, currentUserId) && (
                    <button
                      onClick={e => { e.stopPropagation(); e.preventDefault(); onShareFile(file); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Share"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  )}
                  {hasPermission(CategoryPermissions.DOWNLOAD_FILES) && (
                    <button
                      onClick={e => { e.stopPropagation(); onDownloadFile(file); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400" />
                    </button>
                  )}
                  {hasPermission(CategoryPermissions.DELETE_FILE) && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteFile(file); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                    </button>
                  )}
                  {String(file.created_by) === String(currentUserId) && (
                    <button
                      onClick={e => { e.stopPropagation(); onMoveItem({ id: file.id, name: file.name, type: 'file' }); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="Move"
                    >
                      <Move className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate flex-1 text-gray-900 dark:text-white">{file.name}</h3>
              {file.is_starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current flex-shrink-0" />}
            </div>
            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
              {file.formatted_size} • {file.file_type.toUpperCase()}
            </p>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-600">
              <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(file.created_at)}</div>
              <div className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
                By <span className="font-medium">{file.created_by_name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
