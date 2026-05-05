import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ClipboardList, CheckCircle, XCircle, Wrench, Clock, AlertTriangle, BookOpen, Send } from 'lucide-react';
import {
    useGetNotifications,
    useGetUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    useDeleteAllNotifications,
} from '../hooks/useNotifications';
import type { Notification } from '../services/notificationService';

export const Notifications: React.FC = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const navigate = useNavigate();

    const { data: notifications = [], isLoading, error, refetch } = useGetNotifications();
    const { data: unreadData } = useGetUnreadCount();
    const unreadCount = unreadData?.count || 0;

    const markAsReadMutation         = useMarkAsRead();
    const markAllAsReadMutation      = useMarkAllAsRead();
    const deleteNotificationMutation = useDeleteNotification();
    const deleteAllMutation          = useDeleteAllNotifications();

    const handleNotificationClick = async (notification: Notification) => {
        try {
            if (!notification.is_read) {
                await markAsReadMutation.mutateAsync(notification.id);
            }
            if (notification.link?.trim()) {
                navigate(notification.link.trim());
            }
            setShowNotifications(false);
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const handleMarkAllAsRead = () => markAllAsReadMutation.mutate();
    const handleClearAll      = () => deleteAllMutation.mutate();
    const handleRefresh       = () => refetch();

    const handleDeleteNotification = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteNotificationMutation.mutate(id);
    };

    // =========================================================================
    // ICONS — existing endorsement types preserved + job order types added
    // =========================================================================
    const getNotificationIcon = (type: string): React.ReactNode => {
        switch (type) {
            // ── Existing types (do not remove) ───────────────────────────────
            case 'endorsement_added':   return '📋';
            case 'facility_visit':      return '🏥';
            case 'document_uploaded':   return '📄';
            case 'approval_needed':     return '✅';
            case 'task_assigned':       return '📌';
            case 'system_alert':        return '⚠️';

            // ── Job Order types ───────────────────────────────────────────────
            case 'new_job_order':
                return <ClipboardList size={16} />;
            case 'approved':
                return <CheckCircle size={16} />;
            case 'rejected':
                return <XCircle size={16} />;
            case 'assigned':
                return <Wrench size={16} />;
            case 'resolved':
                return <CheckCircle size={16} />;
            case 'status_update':
                return <Clock size={16} />;

            case 'logbook_endorsement':
                return <BookOpen size={16} />;
            case 'logbook_tc_approved':
                return <CheckCircle size={16} />;
            case 'logbook_endorsement_recall':
                return <Send size={16} />;

            default:
                return 'ℹ️';
        }
    };

    // =========================================================================
    // COLORS — existing types preserved + job order types added
    // =========================================================================
    const getNotificationColor = (type: string): string => {
        switch (type) {
            // ── Existing types (do not remove) ───────────────────────────────
            case 'endorsement_added':
            case 'approval_needed':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
            case 'facility_visit':
            case 'document_uploaded':
                return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
            case 'system_alert':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
            case 'task_assigned':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';

            // ── Job Order types ───────────────────────────────────────────────
            case 'new_job_order':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
            case 'approved':
            case 'resolved':
                return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
            case 'rejected':
                return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
            case 'assigned':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
            case 'status_update':
                return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';

            case 'logbook_endorsement':
                return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
            case 'logbook_tc_approved':
                return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
            case 'logbook_endorsement_recall':
                return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';

            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
        }
    };

    // =========================================================================
    // LABEL BADGE — shows a small pill for job order notifications
    // =========================================================================
    const getJobOrderBadge = (type: string): string | null => {
        const jobOrderTypes = ['new_job_order', 'approved', 'rejected', 'assigned', 'resolved', 'status_update'];
        if (jobOrderTypes.includes(type)) return 'IT Work Order';
        if (type === 'logbook_endorsement') return 'Logbook';
        if (type === 'logbook_tc_approved') return 'Logbook TC';
        if (type === 'logbook_endorsement_recall') return 'Recall';
        return null;
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now  = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60)    return 'Just now';
        if (diffInSeconds < 3600)  return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />

                    {/* Panel */}
                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-top-2 duration-200">

                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <h6 className="font-semibold text-gray-900 dark:text-white">
                                    Notifications
                                </h6>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRefresh}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                        title="Refresh"
                                    >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setShowNotifications(false)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    >
                                        <X size={16} className="text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {notifications.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                                            {unreadCount} New
                                        </span>
                                    )}
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                                        className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Mark all as read
                                    </button>
                                    <button
                                        onClick={handleClearAll}
                                        disabled={deleteAllMutation.isPending}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-96 overflow-y-auto">
                            {error ? (
                                <div className="p-8 text-center text-red-500 dark:text-red-400">
                                    <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Failed to load notifications</p>
                                    <button
                                        onClick={handleRefresh}
                                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : isLoading ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-sm">Loading...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-medium">You're all caught up</p>
                                    <p className="text-xs mt-1 opacity-70">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {notifications.map((notification) => {
                                        const badge = getJobOrderBadge(notification.type);
                                        return (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                                                    !notification.is_read
                                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500'
                                                        : ''
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon */}
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${getNotificationColor(notification.type)}`}>
                                                        {getNotificationIcon(notification.type)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                {/* Badge for job order notifications */}
                                                                {badge && (
                                                                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded mb-1">
                                                                        {badge}
                                                                    </span>
                                                                )}
                                                                <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                                                                    {notification.title}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {!notification.is_read && (
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                                                                )}
                                                                <button
                                                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Delete"
                                                                >
                                                                    <X size={13} className="text-gray-400" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                            {notification.message}
                                                        </p>

                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                {formatTimeAgo(notification.created_at)}
                                                            </span>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                by {notification.created_by}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};