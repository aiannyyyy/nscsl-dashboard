import { User, Activity, File, HardDrive, TrendingUp, Folder, Calendar } from 'lucide-react';
import { formatFileSize, normalizeAction } from './utils';
import type { ActivityLog, DashboardStats } from './types';

interface AnalyticsInsightsProps {
  activities: ActivityLog[];
  stats: DashboardStats | null;
  onViewDetails: () => void;
}

const ACTION_BAR_COLORS: Record<string, string> = {
  UPLOAD: 'bg-green-500',
  DOWNLOAD: 'bg-blue-500',
  DELETE: 'bg-red-500',
  CREATE: 'bg-purple-500',
  UPDATE: 'bg-orange-500',
  RENAME: 'bg-yellow-500',
  COPY: 'bg-indigo-500',
  MOVE: 'bg-teal-500',
};

export default function AnalyticsInsights({
  activities,
  stats,
  onViewDetails,
}: AnalyticsInsightsProps) {
  const uniqueUsers = new Set(activities.map((a) => a.user_name)).size;

  const mostActiveCount = activities.length > 0
    ? Math.max(
        ...Object.values(
          activities.reduce((acc, curr) => {
            acc[curr.user_name] = (acc[curr.user_name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
      )
    : 0;

  const actionCounts = activities.reduce((acc, curr) => {
    const norm = normalizeAction(curr.action);
    acc[norm] = (acc[norm] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = activities.length || 1;

  const actionsInLastHour = activities.filter(
    (a) => new Date(a.created_at) > new Date(Date.now() - 60 * 60 * 1000)
  ).length;

  const avgFileSize =
    stats && stats.totalFiles > 0
      ? formatFileSize(Math.round(stats.totalSize / stats.totalFiles))
      : '0 Bytes';

  const filesPerFolder =
    stats && stats.totalFolders > 0 && stats.totalFiles > 0
      ? `${Math.round(stats.totalFiles / stats.totalFolders)} files per folder`
      : 'No data available';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics & Insights</h3>
        <button
          onClick={onViewDetails}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details
        </button>
      </div>

      <div className="h-80 overflow-y-auto overflow-x-hidden pr-2 space-y-6">

        {/* User Activity Summary */}
        <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> User Activity Summary
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Active Today</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{uniqueUsers} users</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Actions</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{activities.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Most Active</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{mostActiveCount} actions</span>
            </div>
          </div>
        </div>

        {/* Action Breakdown */}
        <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" /> Action Breakdown
          </h4>
          <div className="space-y-3">
            {Object.entries(actionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([action, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 capitalize">
                        {action.toLowerCase()}s
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`${ACTION_BAR_COLORS[action] || 'bg-gray-500'} h-1.5 rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* File Type Distribution */}
        <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <File className="w-4 h-4 text-purple-600" /> File Type Distribution
          </h4>
          <div className="space-y-2">
            {stats?.fileTypes && stats.fileTypes.length > 0 ? (
              stats.fileTypes.slice(0, 3).map((fileType) => {
                const pct =
                  stats.totalSize > 0
                    ? Math.round((fileType.total_size / stats.totalSize) * 100)
                    : 0;
                return (
                  <div key={fileType.file_type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {fileType.file_type || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{fileType.count} files</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{pct}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No file data available</p>
            )}
          </div>
        </div>

        {/* Storage Insights */}
        <div className="pb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-orange-600" /> Storage Insights
          </h4>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Average File Size</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">{avgFileSize} per file</div>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Folder className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-green-900">Folder Organization</div>
                  <div className="text-xs text-green-700 mt-1">{filesPerFolder}</div>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-purple-900">Recent Activity</div>
                  <div className="text-xs text-purple-700 mt-1">
                    {activities.length > 0
                      ? `${actionsInLastHour} actions in last hour`
                      : 'No recent activity'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}