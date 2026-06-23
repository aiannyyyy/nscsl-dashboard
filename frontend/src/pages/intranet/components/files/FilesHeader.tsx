import { ChevronRight, History, Home, RefreshCw } from 'lucide-react';
import type { BreadcrumbItem } from './types';

interface FilesHeaderProps {
  folderPath: BreadcrumbItem[];
  onOpenHistory: () => void;
  onRefresh: () => void;
  onBreadcrumbClick: (item: BreadcrumbItem) => void;
}

export default function FilesHeader({
  folderPath,
  onOpenHistory,
  onRefresh,
  onBreadcrumbClick,
}: FilesHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Files</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <History className="w-4 h-4" /> History
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>
      <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        {folderPath.map((crumb, i) => (
          <div key={crumb.path || i} className="flex items-center">
            {i === 0 && <Home className="w-4 h-4 mr-1" />}
            <button
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => onBreadcrumbClick(crumb)}
            >
              {crumb.name}
            </button>
            {i < folderPath.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400 dark:text-gray-600" />
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
