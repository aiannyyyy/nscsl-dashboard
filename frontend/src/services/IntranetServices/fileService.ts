// services/IntranetServices/fileService.ts
import api from '../api';

const BASE = '/intranet/files';

// ============================================
// TYPES
// ============================================
export interface IntranetFile {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    folder_id: number | null;
    document_status?: string;
    stamp_placement?: string;
    created_by: number;
    created_by_name?: string;
    updated_by?: number;
    updated_by_name?: string;
    created_at: string;
    updated_at: string;
}

export interface IntranetFolder {
    id: number;
    name: string;
    parent_id: number | null;
    created_by: number;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
}

export interface ListResponse {
    folders: IntranetFolder[];
    files: IntranetFile[];
    location: string;
    currentFolder?: IntranetFolder;
}

export interface ConflictResponse {
    conflict: true;
    message: string;
    existing_file: { id: number; file_name: string };
    uploaded_file: { temp_path: string; file_name: string; file_size: number; file_type: string };
    available_strategies: ('overwrite' | 'version' | 'skip')[];
}

// ============================================
// FOLDERS
// ============================================
export const createFolder = (name: string, parent_id: number | null, created_by: number) =>
    api.post(`${BASE}/folders`, { name, parent_id, created_by });

export const bulkCreateFolders = (folders: { name: string; parent_id: number | null }[], created_by: number) =>
    api.post(`${BASE}/folders/bulk`, { folders, created_by });

export const getFolderPath = (folderId: number) =>
    api.get(`${BASE}/path/${folderId}`);

// ============================================
// LISTING
// ============================================
export const getRootList = () =>
    api.get<ListResponse>(`${BASE}/list`);

export const getFolderContents = (folderId: number) =>
    api.get<ListResponse>(`${BASE}/list/${folderId}`);

export const getItemInfo = (id: number) =>
    api.get(`${BASE}/info/${id}`);

// ============================================
// UPLOAD
// ============================================
export const uploadFile = (file: File, folder_id: number | null, created_by: number, extra?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('created_by', String(created_by));
    if (folder_id) formData.append('folder_id', String(folder_id));
    if (extra) Object.entries(extra).forEach(([k, v]) => formData.append(k, v));

    return api.post<{ message: string; fileId: number; fileName: string }>(`${BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const uploadMultipleFiles = (files: File[], folder_id: number | null, created_by: number) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('created_by', String(created_by));
    if (folder_id) formData.append('folder_id', String(folder_id));

    return api.post(`${BASE}/upload/multiple`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const resolveUploadConflict = (payload: {
    conflict_strategy: 'overwrite' | 'version' | 'skip';
    temp_path: string;
    file_name: string;
    file_size: number;
    file_type: string;
    folder_id: number | null;
    created_by: number;
    existing_file_id?: number;
}) => api.post(`${BASE}/upload/resolve`, payload);

// ============================================
// DOWNLOAD / PREVIEW
// ============================================
export const getDownloadUrl = (fileId: number, userId: number, preview = false) =>
    `${api.defaults.baseURL}${BASE}/download/${fileId}?user_id=${userId}${preview ? '&preview=true' : ''}`;

export const getPreviewUrl = (fileId: number) =>
    `${api.defaults.baseURL}${BASE}/preview/${fileId}`;

export const downloadFolderAsZip = (folderId: number) =>
    `${api.defaults.baseURL}${BASE}/download/folder/${folderId}`;

export const bulkDownload = (itemIds: number[]) =>
    api.post(`${BASE}/download/bulk`, { itemIds }, { responseType: 'blob' });

// ============================================
// MANAGEMENT
// ============================================
export const renameItem = (id: number, new_name: string, updated_by: number) =>
    api.patch(`${BASE}/${id}`, { new_name, updated_by });

export const moveItem = (id: number, new_folder_id: number | null, updated_by: number) =>
    api.patch(`${BASE}/${id}`, { new_folder_id, updated_by });

export const deleteItem = (id: number, updated_by: number, force = false) =>
    api.delete(`${BASE}/${id}`, { data: { updated_by, force } });

export const bulkDelete = (ids: number[], updated_by: number, force = false) =>
    api.delete(`${BASE}/bulk/delete`, { data: { ids, updated_by, force } });

export const copyItems = (source_ids: number[], target_folder_id: number | null, created_by: number) =>
    api.post(`${BASE}/copy`, { source_ids, target_folder_id, created_by });

// ============================================
// SEARCH & STATS
// ============================================
export const search = (query: string, filters?: Record<string, string>) =>
    api.get(`${BASE}/search`, { params: { q: query, ...filters } });

export const getStats = () =>
    api.get(`${BASE}/stats`);

export const getActivityLogs = (params?: { user_id?: number; action?: string; limit?: number; offset?: number }) =>
    api.get(`${BASE}/activity-logs`, { params });

export const getDiskUsage = () =>
    api.get(`${BASE}/disk-usage`);

export const getRecentFiles = (limit = 20, userId?: number) =>
    api.get(`${BASE}/recent`, { params: { limit, user_id: userId } });

// ============================================
// STARRED FILES
// ============================================
export const getStarredFiles = (userId: number) =>
    api.get(`${BASE}/starred`, { params: { user_id: userId } });

export const toggleStar = (fileId: number, userId: number) =>
    api.post(`${BASE}/star/${fileId}`, { user_id: userId });

export const unstarFile = (fileId: number, userId: number) =>
    api.delete(`${BASE}/star/${fileId}`, { data: { user_id: userId } });

export const getStarStatus = (fileId: number, userId: number) =>
    api.get(`${BASE}/star/status/${fileId}`, { params: { user_id: userId } });

// ============================================
// USERS (for sharing dropdown)
// ============================================
export const getUsers = () =>
    api.get(`${BASE}/users`);

export default {
    createFolder,
    bulkCreateFolders,
    getFolderPath,
    getRootList,
    getFolderContents,
    getItemInfo,
    uploadFile,
    uploadMultipleFiles,
    resolveUploadConflict,
    getDownloadUrl,
    getPreviewUrl,
    downloadFolderAsZip,
    bulkDownload,
    renameItem,
    moveItem,
    deleteItem,
    bulkDelete,
    copyItems,
    search,
    getStats,
    getActivityLogs,
    getDiskUsage,
    getRecentFiles,
    getStarredFiles,
    toggleStar,
    unstarFile,
    getStarStatus,
    getUsers
};