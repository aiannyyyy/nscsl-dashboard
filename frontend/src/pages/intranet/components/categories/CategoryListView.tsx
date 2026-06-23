import { Edit3, Trash2 } from 'lucide-react';
import useCategoryPermissions, { CategoryPermissions } from './permissions';
import { formatDate, getColorClasses, getIconComponent } from './utils';
import type { Category } from './types';

interface CategoryListViewProps {
  categories: Category[];
  onCategoryClick: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

export default function CategoryListView({
  categories,
  onCategoryClick,
  onEditCategory,
  onDeleteCategory,
}: CategoryListViewProps) {
  const { hasPermission } = useCategoryPermissions();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {['Category', 'Description', 'Last Updated', 'Created By', ''].map((h, i) => (
              <th
                key={i}
                className={`text-left p-4 font-medium text-gray-700 dark:text-gray-300 ${i === 4 ? 'w-12' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {categories.map(category => {
            const Icon = getIconComponent(category.icon);
            const cc = getColorClasses(category.color);
            return (
              <tr
                key={category.id}
                onClick={() => onCategoryClick(category)}
                className="transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 ${cc.bg} rounded-lg cursor-pointer`}
                      onClick={() => onCategoryClick(category)}
                    >
                      <Icon className={`w-5 h-5 ${cc.text}`} />
                    </div>
                    <div
                      className="font-medium cursor-pointer text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => onCategoryClick(category)}
                    >
                      {category.name}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm max-w-xs truncate text-gray-600 dark:text-gray-400">{category.description}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(category.updated_at)}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{category.created_by_name || 'Unknown'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {hasPermission(CategoryPermissions.EDIT) && (
                      <button
                        onClick={() => onEditCategory(category)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit3 className="w-4 h-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                      </button>
                    )}
                    {hasPermission(CategoryPermissions.DELETE) && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteCategory(category); }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
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
