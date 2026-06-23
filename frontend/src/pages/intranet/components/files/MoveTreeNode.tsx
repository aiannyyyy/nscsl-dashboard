import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { FolderNode } from './types';

export interface MoveTreeNodeProps {
  node: FolderNode;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onToggle: (id: string, name: string, isOpen: boolean) => void;
  disabledIds: string[];
  depth?: number;
}

export default function MoveTreeNode({
  node,
  selectedId,
  onSelect,
  onToggle,
  disabledIds,
  depth = 0,
}: MoveTreeNodeProps) {
  const isSelected = selectedId === node.id;
  const isDisabled = disabledIds.includes(node.id);
  const hasChildren = !node.isLoaded || (node.children && node.children.length > 0);

  return (
    <div>
      <div
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => !isDisabled && onSelect(node.id, node.name)}
        className={`flex items-center gap-2 pr-3 py-2 rounded-lg cursor-pointer transition-colors select-none ${
          isSelected
            ? 'bg-blue-600 text-white'
            : isDisabled
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            if (!isDisabled) onToggle(node.id, node.name, !!node.isOpen);
          }}
          className="w-4 h-4 flex-shrink-0 flex items-center justify-center"
        >
          {hasChildren ? (
            node.isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>
        {node.isOpen ? (
          <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
        ) : (
          <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
        )}
        <span className="text-sm truncate flex-1">{node.name}</span>
        {isDisabled && (
          <span className="text-xs ml-auto flex-shrink-0 text-gray-300 dark:text-gray-600">
            can&apos;t move here
          </span>
        )}
      </div>
      {node.isOpen &&
        node.children &&
        node.children.map(child => (
          <MoveTreeNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
            disabledIds={disabledIds}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
