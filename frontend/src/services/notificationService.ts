import api from './api';

// Base endpoint
const NOTIFICATION_ENDPOINT = '/notifications';

// Types
export interface Notification {
    id: number;
    department: 'Admin' | 'Administrator' | 'Program' | 'Laboratory' | 'Follow Up' | string;
    user_id: number | null;
    type: string;
    title: string;
    message: string;
    link: string | null;
    reference_id: number | null;
    reference_type: string | null;
    is_read: boolean;
    created_by: string;
    created_at: string;
    read_at: string | null;
}

export interface UnreadCountResponse {
    count: number;
}

export interface CreateNotificationPayload {
    department: 'admin' | 'administrator' | 'program' | 'laboratory' | 'followup' | 'follow up' | string;
    user_id?: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    reference_id?: number;
    reference_type?: string;
}

export interface NotificationResponse {
    message: string;
    id?: number;
    updated?: number;
    deleted?: number;
}

// Get all notifications for current user's department
export const getNotifications = async (limit = 50, offset = 0): Promise<Notification[]> => {
    const response = await api.get(`${NOTIFICATION_ENDPOINT}?limit=${limit}&offset=${offset}`);
    return response.data;
};

// Get unread notification count
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
    const response = await api.get(`${NOTIFICATION_ENDPOINT}/unread-count`);
    return response.data;
};

// Create a new notification
export const createNotification = async (data: CreateNotificationPayload): Promise<NotificationResponse> => {
    const response = await api.post(NOTIFICATION_ENDPOINT, data);
    return response.data;
};

// Mark notification as read
export const markAsRead = async (id: number): Promise<NotificationResponse> => {
    const response = await api.patch(`${NOTIFICATION_ENDPOINT}/${id}/read`);
    return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<NotificationResponse> => {
    const response = await api.patch(`${NOTIFICATION_ENDPOINT}/mark-all-read`);
    return response.data;
};

// Delete notification
export const deleteNotification = async (id: number): Promise<NotificationResponse> => {
    const response = await api.delete(`${NOTIFICATION_ENDPOINT}/${id}`);
    return response.data;
};

// Delete all notifications
export const deleteAllNotifications = async (): Promise<NotificationResponse> => {
    const response = await api.delete(`${NOTIFICATION_ENDPOINT}/delete-all`);
    return response.data;
};

export default {
    getNotifications,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
};