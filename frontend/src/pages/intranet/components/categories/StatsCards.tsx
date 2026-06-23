import { BarChart3, FileText, Folder, FolderOpen, Star, Users } from 'lucide-react';
import { formatFileSize } from './utils';
import type { Category, FileItem, Folder as FolderType, ViewType } from './types';

interface StatsCardsProps {
  currentView: ViewType;
  categories: Category[];
  folders: FolderType[];
  files: FileItem[];
}

export default function StatsCards({ currentView, categories, folders, files }: StatsCardsProps) {
  const totalSize = files.reduce((s, f) => s + f.file_size, 0);

  const categoryStats = [
    {
      icon: <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50 dark:bg-gray-700',
      label: 'Total Categories',
      value: categories.length,
    },
    {
      icon: <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />,
      bg: 'bg-green-50 dark:bg-gray-700',
      label: 'Active',
      value: categories.filter(c => c.is_active).length,
    },
    {
      icon: <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      bg: 'bg-purple-50 dark:bg-gray-700',
      label: 'Recent Updates',
      value: categories.filter(c => Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000) <= 7).length,
    },
    {
      icon: <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
      bg: 'bg-orange-50 dark:bg-gray-700',
      label: 'Contributors',
      value: new Set(categories.map(c => c.created_by)).size,
    },
  ];

  const filesStats = [
    {
      icon: <Folder className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
      bg: 'bg-yellow-50 dark:bg-gray-700',
      label: 'Folders',
      value: folders.length,
    },
    {
      icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50 dark:bg-gray-700',
      label: 'Files',
      value: files.length,
    },
    {
      icon: <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />,
      bg: 'bg-green-50 dark:bg-gray-700',
      label: 'Total Size',
      value: totalSize ? formatFileSize(totalSize) : '0 B',
    },
    {
      icon: <Star className="w-4 h-4 text-red-600 dark:text-red-400" />,
      bg: 'bg-red-50 dark:bg-gray-700',
      label: 'Starred',
      value: files.filter(f => f.is_starred).length,
    },
  ];

  const stats = currentView === 'categories' ? categoryStats : filesStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-3"
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
