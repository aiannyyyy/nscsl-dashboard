// services/IntranetServices/shareService.ts
import api from '../api';

const BASE = '/intranet/share';

// ============================================
// TYPES
// ============================================
export interface ShareUser {
    id: number;
    user_name: string;
    name: string;
    department: string;
    position: string;
    role: string;
}

export interface FileShare {
    id: number;
    shared_with: number;
    created_at: string;
    username: string;
    user_name: string;
    email?: string;
    department: string;
    position: string;
}

export interface SharedItem {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
    shared_at: string;
    owner_name: string;
    owner_department: string;
    shared_by_name: string;
    source_type: 'regular' | 'category';
}

// ============================================
// SHARE FILE / CATEGORY FILE / CATEGORY
// ============================================
export const shareFile = (fileId: number, userIds: number[]) =>
    api.post(`${BASE}/files/${fileId}/share`, { userIds });

export const shareCategoryFile = (categoryFileId: number, userIds: number[]) =>
    api.post(`${BASE}/category-files/${categoryFileId}/share`, { userIds });

export const shareCategory = (categoryId: number, userIds: number[]) =>
    api.post(`${BASE}/categories/${categoryId}/share`, { userIds });

// ============================================
// GET SHARES
// ============================================
export const getSharedWithMe = () =>
    api.get<{ success: boolean; data: SharedItem[]; count: number }>(`${BASE}/shared-with-me`);

export const getFileShares = (fileId: number) =>
    api.get<{ success: boolean; data: FileShare[]; count: number }>(`${BASE}/files/${fileId}/shares`);

export const getCategoryFileShares = (categoryFileId: number) =>
    api.get<{ success: boolean; data: FileShare[]; count: number }>(`${BASE}/category-files/${categoryFileId}/shares`);

export const getCategoryShares = (categoryId: number) =>
    api.get<{ success: boolean; data: FileShare[]; count: number }>(`${BASE}/categories/${categoryId}/shares`);

export const getSharedCategoriesWithMe = () =>
    api.get(`${BASE}/shared-categories-with-me`);

// ============================================
// USERS & ACCESS
// ============================================
export const getAllUsersForShare = () =>
    api.get<{ success: boolean; data: ShareUser[]; count: number }>(`${BASE}/users/all`);

export const checkFileAccess = (fileId: number, type: 'regular' | 'category') =>
    api.get<{ success: boolean; hasAccess: boolean; isOwner: boolean }>(`${BASE}/files/${fileId}/access/${type}`);

// ============================================
// REMOVE SHARE
// ============================================
export const removeShare = (shareId: number) =>
    api.delete(`${BASE}/shares/${shareId}`);

export const removeCategoryShare = (categoryId: number, userId: number) =>
    api.delete(`${BASE}/categories/${categoryId}/remove-user/${userId}`);

export default {
    shareFile,
    shareCategoryFile,
    shareCategory,
    getSharedWithMe,
    getFileShares,
    getCategoryFileShares,
    getCategoryShares,
    getSharedCategoriesWithMe,
    getAllUsersForShare,
    checkFileAccess,
    removeShare,
    removeCategoryShare
};