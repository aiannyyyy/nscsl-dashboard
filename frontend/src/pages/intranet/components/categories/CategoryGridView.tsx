import { Edit3, Trash2 } from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import { formatDate, getColorClasses, getIconComponent } from './utils';
import type { Category } from './types';

interface CategoryGridViewProps {
  categories: Category[];
  onCategoryClick: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

export default function CategoryGridView({
  categories,
  onCategoryClick,
  onEditCategory,
  onDeleteCategory,
}: CategoryGridViewProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="p-6 bg-white dark:bg-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map(category => {
          const Icon = getIconComponent(category.icon);
          const cc = getColorClasses(category.color);
          return (
            <div
              key={category.id}
              onClick={() => onCategoryClick(category)}
              className="group border rounded-xl p-6 hover:shadow-md transition-all duration-200 cursor-pointer bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-3 ${cc.bg} rounded-lg cursor-pointer`}
                  onClick={() => onCategoryClick(category)}
                >
                  <Icon className={`w-6 h-6 ${cc.text}`} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasPermission(CategoryPermissions.EDIT) && (
                    <button
                      onClick={e => { e.stopPropagation(); onEditCategory(category); }}
                      className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <Edit3 className="w-4 h-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                    </button>
                  )}
                  {hasPermission(CategoryPermissions.DELETE) && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteCategory(category); }}
                      className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              <h3
                className="font-semibold mb-2 group-hover:text-blue-600 transition-colors cursor-pointer text-gray-900 dark:text-white"
                onClick={() => onCategoryClick(category)}
              >
                {category.name}
              </h3>
              <p className="text-sm mb-4 line-clamp-2 text-gray-600 dark:text-gray-400">{category.description}</p>
              <div className="text-sm mb-3 text-gray-500 dark:text-gray-400">{formatDate(category.updated_at)}</div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Created by <span className="font-medium">{category.created_by_name || 'Unknown'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
