import React from 'react';
import { ArrowLeft, ChevronRight, History, Home } from 'lucide-react';
import type { BreadcrumbItem, ViewType } from './types';

interface CategoriesHeaderProps {
  currentView: ViewType;
  breadcrumb: BreadcrumbItem[];
  onBackToCategories: () => void;
  onBreadcrumbClick: (index: number) => void;
  onOpenHistory: () => void;
}

export default function CategoriesHeader({
  currentView,
  breadcrumb,
  onBackToCategories,
  onBreadcrumbClick,
  onOpenHistory,
}: CategoriesHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          {currentView !== 'categories' && (
            <button
              onClick={onBackToCategories}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentView === 'categories' ? 'Categories' : 'File Management'}
          </h1>
        </div>
        {currentView === 'files-folders' && (
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <History className="w-4 h-4" /> History
          </button>
        )}
      </div>
      {currentView === 'files-folders' && breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Home className="w-4 h-4" />
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => onBreadcrumbClick(i)}
                className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
