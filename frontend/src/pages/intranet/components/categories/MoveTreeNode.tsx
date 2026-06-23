import React, { useState } from 'react';
import { ChevronRight, Folder, Loader } from 'lucide-react';
import categoryMoveService from '../../../../services/IntranetServices/categoryMoveService';
import type { FolderNode } from './types';

export interface MoveTreeNodeProps {
  folder: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  moveItemIds: number[];
  onSelect: (folderId: string, folderName: string, categoryId: number) => void;
}

const MoveTreeNode: React.FC<MoveTreeNodeProps> = ({
  folder,
  depth,
  selectedFolderId,
  moveItemIds,
  onSelect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FolderNode[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isSelected = String(selectedFolderId) === String(folder.id);
  const isBeingMoved = moveItemIds.includes(folder.id);

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && !hasLoaded) {
      setLoadingChildren(true);
      try {
        const res = await categoryMoveService.getFoldersForTree(folder.category_id, folder.id);
        setChildren((res.data.folders || []) as FolderNode[]);
        setHasLoaded(true);
      } catch {
        // ignore load errors
      }
      setLoadingChildren(false);
    }
    setExpanded(v => !v);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-lg mb-0.5 transition-colors
          ${isBeingMoved ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${isSelected
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px', paddingTop: '7px', paddingBottom: '7px' }}
        onClick={() => !isBeingMoved && onSelect(String(folder.id), folder.name, folder.category_id)}
      >
        <button
          onClick={handleExpand}
          className={`p-0.5 rounded flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
        >
          {loadingChildren
            ? <Loader className="w-3 h-3 animate-spin" />
            : <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          }
        </button>
        <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-yellow-500'}`} />
        <span className="text-sm truncate">{folder.name}</span>
        {isBeingMoved && <span className="ml-auto text-xs opacity-60">(moving)</span>}
      </div>
      {expanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <MoveTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              moveItemIds={moveItemIds}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      {expanded && hasLoaded && children.length === 0 && (
        <div
          className="text-xs py-1 text-gray-400 dark:text-gray-500"
          style={{ paddingLeft: `${24 + depth * 16}px` }}
        >
          No subfolders
        </div>
      )}
    </div>
  );
};

export default MoveTreeNode;
