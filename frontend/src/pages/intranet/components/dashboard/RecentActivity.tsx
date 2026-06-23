import { RefreshCw, Clock, Activity } from 'lucide-react';
import {
  getActivityIcon,
  getActionDescription,
  getActionBadgeColor,
  getActionBubbleColor,
  getActionLabel,
  formatTimeAgo,
} from './utils';
import type { ActivityLog } from './types';

interface RecentActivityProps {
  activities: ActivityLog[];
  loading: boolean;
  onRefresh: () => void;
  onViewAll: () => void;
}

export default function RecentActivity({
  activities,
  loading,
  onRefresh,
  onViewAll,
}: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 font-medium px-2 py-1 rounded hover:bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Files
          </button>
        </div>
      </div>

      <div className="h-80 overflow-y-auto overflow-x-hidden">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">Loading activities...</span>
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div className="space-y-4 pr-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full mt-1 flex-shrink-0 ${getActionBubbleColor(activity.action)}`}>
                  {getActivityIcon(activity.action, activity.target_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.user_name}</span>{' '}
                    {getActionDescription(activity.action, activity.target_type, activity.target_name)}{' '}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(activity.action)}`}>
                      {getActionLabel(activity.action)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {formatTimeAgo(activity.created_at)}
                    <span className="ml-2">• {activity.target_type === 'FOLDER' ? 'Folder' : 'File'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center">
            <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No recent activity</p>
            <button onClick={onViewAll} className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
              Upload your first file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}