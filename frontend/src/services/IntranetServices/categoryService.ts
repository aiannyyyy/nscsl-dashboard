// services/IntranetServices/categoryService.ts
import api from '../api';

const BASE = '/intranet/categories';

// ============================================
// TYPES
// ============================================
export interface Category {
    id: number;
    name: string;
    description?: string;
    color: string;
    icon: string;
    is_active: number;
    created_by: number;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
}

export interface CategoryFolder {
    id: number;
    name: string;
    description?: string;
    category_id: number;
    parent_folder_id: number | null;
    path: string;
    is_active: number;
    created_by: number;
    created_at: string;
}

export interface CategoryFile {
    id: number;
    name: string;
    original_name: string;
    description?: string;
    file_type: string;
    file_size: number;
    mime_type: string;
    file_path: string;
    category_id: number;
    folder_id: number | null;
    document_status?: string;
    stamp_placement?: string;
    is_starred: number;
    is_active: number;
    download_count: number;
    created_by: number;
    created_by_name?: string;
    created_at: string;
}

// ============================================
// CATEGORIES
// ============================================
export const getCategories = (params?: { is_active?: boolean; created_by?: number }) =>
    api.get<{ message: string; categories: Category[]; count: number }>(`${BASE}`, { params });

export const getCategory = (id: number) =>
    api.get<{ message: string; category: Category }>(`${BASE}/${id}`);

export const createCategory = (data: { name: string; description?: string; color?: string; icon?: string; created_by: number }) =>
    api.post(`${BASE}`, data);

export const updateCategory = (id: number, data: Partial<Category> & { updated_by: number }) =>
    api.put(`${BASE}/${id}`, data);

export const deleteCategory = (id: number, deleted_by: number) =>
    api.delete(`${BASE}/${id}`, { data: { deleted_by } });

// ============================================
// FOLDERS
// ============================================
export const getFolders = (params?: { category_id?: number; parent_folder_id?: number | string; is_active?: boolean }) =>
    api.get<{ message: string; folders: CategoryFolder[] }>(`${BASE}/folders`, { params });

export const getFolder = (id: number) =>
    api.get(`${BASE}/folders/${id}`);

export const createFolder = (data: { name: string; description?: string; category_id: number; parent_folder_id?: number | null; created_by: number }) =>
    api.post(`${BASE}/folders`, data);

export const updateFolder = (id: number, data: Partial<CategoryFolder> & { updated_by: number }) =>
    api.put(`${BASE}/folders/${id}`, data);

export const deleteFolder = (id: number, deleted_by: number) =>
    api.delete(`${BASE}/folders/${id}`, { data: { deleted_by } }); // ✅ fixed

export const getFolderTree = (categoryId: number) =>
    api.get(`${BASE}/folders/tree/${categoryId}`);

// ============================================
// SEARCH
// ============================================
export const search = (query: string, limit = 50) =>
    api.get(`${BASE}/search`, { params: { q: query, limit } });

// ============================================
// FILES
// ============================================
export const getFiles = (params?: { category_id?: number; folder_id?: number | string; file_type?: string; is_starred?: boolean; search?: string; limit?: number; offset?: number }) =>
    api.get<{ message: string; files: CategoryFile[]; total_count: number }>(`${BASE}/files`, { params });

export const getFile = (id: number) =>
    api.get<{ message: string; file: CategoryFile }>(`${BASE}/files/${id}`);

export const updateFile = (id: number, data: Partial<CategoryFile> & { updated_by: number }) =>
    api.put(`${BASE}/files/${id}`, data);

export const deleteFile = (id: number, deleted_by: number) =>
    api.delete(`${BASE}/files/${id}`, { data: { deleted_by } }); // ✅ fixed

// ============================================
// UPLOAD
// ============================================
export const uploadSingleFile = (
    file: File,
    category_id: number,
    folder_id: number | null,
    created_by: number,
    extra?: Record<string, string>,
) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category_id', String(category_id));
    formData.append('created_by', String(created_by));
    if (folder_id) formData.append('folder_id', String(folder_id));
    if (extra) Object.entries(extra).forEach(([k, v]) => formData.append(k, v));

    return api.post(`${BASE}/files/upload-single`, formData);
};

export const uploadMultipleFiles = (
    files: File[],
    category_id: number,
    folder_id: number | null,
    created_by: number,
    extra?: Record<string, string>,
) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('category_id', String(category_id));
    formData.append('created_by', String(created_by));
    if (folder_id) formData.append('folder_id', String(folder_id));
    if (extra) Object.entries(extra).forEach(([k, v]) => formData.append(k, v));

    return api.post(`${BASE}/files/upload-multiple`, formData);
};

export const resolveUploadConflict = (payload: {
    strategy: 'overwrite' | 'version' | 'skip';
    temp_path: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    file_type: string;
    existing_file_id?: number;
    category_id: number;
    folder_id: number | null;
    created_by: number;
    document_status?: string;
    stamp_placement?: string;
}) => api.post(`${BASE}/files/upload/resolve`, payload);

// ============================================
// DOWNLOAD / PREVIEW
// ============================================
export const getDownloadUrl = (fileId: number, userId: number, preview = false) =>
    `${api.defaults.baseURL}${BASE}/files/${fileId}/download?user_id=${userId}${preview ? '&preview=true' : ''}`;

export const getPreviewUrl = (fileId: number, userId: number) =>
    `${api.defaults.baseURL}${BASE}/files/${fileId}/preview?user_id=${userId}`;

export const downloadFileBlob = (fileId: number, userId: number) =>
    api.get<Blob>(`${BASE}/files/${fileId}/download`, {
        params: { user_id: userId },
        responseType: 'blob',
    });

// ============================================
// MOVE
// ============================================
export const moveMultipleFiles = (
    file_ids: number[],
    target_category_id: number,
    target_folder_id: number | null,
    moved_by: number,
) =>
    api.post(`${BASE}/files/move-multiple`, { file_ids, target_category_id, target_folder_id, moved_by });

// ============================================
// VERSION HISTORY
// ============================================
export const getFileVersions = (fileId: number) =>
    api.get(`${BASE}/files/${fileId}/versions`);

export const restoreFileVersion = (fileId: number, versionId: number, restored_by: number) =>
    api.post(`${BASE}/files/${fileId}/versions/${versionId}/restore`, { restored_by });

export const deleteFileVersion = (fileId: number, versionId: number, deleted_by: number) =>
    api.delete(`${BASE}/files/${fileId}/versions/${versionId}`, { data: { deleted_by } });

// ============================================
// STARRED FILES
// ============================================
export const getStarredFiles = (userId: number) =>
    api.get(`${BASE}/starred-files`, { params: { user_id: userId } });

export const toggleStar = (fileId: number, userId: number) =>
    api.post(`${BASE}/starred-files/star/${fileId}`, { user_id: userId });

export const unstarFile = (fileId: number, userId: number) =>
    api.delete(`${BASE}/starred-files/star/${fileId}`, { data: { user_id: userId } });

export const getStarStatus = (fileId: number, userId: number) =>
    api.get(`${BASE}/starred-files/star/status/${fileId}`, { params: { user_id: userId } });

// ============================================
// STATS
// ============================================
export const getFileStats = (categoryId: number) =>
    api.get(`${BASE}/files/stats/${categoryId}`);

export default {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    getFolders,
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderTree,
    search,
    getFiles,
    getFile,
    updateFile,
    deleteFile,
    uploadSingleFile,
    uploadMultipleFiles,
    resolveUploadConflict,
    getDownloadUrl,
    getPreviewUrl,
    downloadFileBlob,
    moveMultipleFiles,
    getFileVersions,
    restoreFileVersion,
    deleteFileVersion,
    getStarredFiles,
    toggleStar,
    unstarFile,
    getStarStatus,
    getFileStats,
};