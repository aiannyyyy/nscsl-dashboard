import { FileText, HardDrive, Folder, File } from 'lucide-react';
import type { DashboardStats } from './types';

interface StatsGridProps {
  stats: DashboardStats | null;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Files</h3>
            <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.totalFiles || 0}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Storage Used</h3>
            <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
              {stats?.totalSizeFormatted || '0 Bytes'}
            </p>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total storage</span>
            </div>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <HardDrive className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Folders</h3>
            <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.totalFolders || 0}</p>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Folders created</span>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <Folder className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">File Types</h3>
            <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
              {stats?.fileTypes?.length || 0}
            </p>
            <span className="text-gray-500 dark:text-gray-400">Different types</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <File className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}