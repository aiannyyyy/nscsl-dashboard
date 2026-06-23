import { Upload, FolderPlus, Share2, Activity } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: 'upload' | 'folder' | 'share' | 'reports') => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <button
          onClick={() => onAction('upload')}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded-lg transition-colors"
        >
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Upload Files</div>
            <div className="text-sm text-gray-500">Add new documents</div>
          </div>
        </button>

        <button
          onClick={() => onAction('folder')}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded-lg transition-colors"
        >
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FolderPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Create Folder</div>
            <div className="text-sm text-gray-500">Organize your files</div>
          </div>
        </button>

        <button
          onClick={() => onAction('share')}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded-lg transition-colors"
        >
          <div className="p-2 bg-purple-50 rounded-lg">
            <Share2 className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Manage Files</div>
            <div className="text-sm text-gray-500">Go to file manager</div>
          </div>
        </button>

        <button
          onClick={() => onAction('reports')}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded-lg transition-colors"
        >
          <div className="p-2 bg-orange-50 rounded-lg">
            <Activity className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">View Reports</div>
            <div className="text-sm text-gray-500">Analyze usage data</div>
          </div>
        </button>
      </div>
    </div>
  );
}