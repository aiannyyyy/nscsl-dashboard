// services/IntranetServices/moveService.ts
import api from '../api';

const BASE = '/intranet/move';

// ============================================
// TYPES
// ============================================
export type ConflictStrategy = 'ask' | 'overwrite' | 'version' | 'skip';

export interface MoveConflict {
    id: number;
    name: string;
    type: 'file' | 'folder';
    conflicting_id: number;
    conflicting_name?: string;
}

export interface MoveResult {
    message: string;
    moved?: boolean;
    skipped?: boolean;
    conflict?: boolean;
    batch_id?: string;
    strategy_used?: string;
    conflicts?: MoveConflict[];
    available_strategies?: string[];
}

export interface MovePreviewItem {
    id: number;
    name: string;
    type: 'file' | 'folder';
}

export interface VersionEntry {
    id: number;
    version_number: number;
    file_name: string;
    file_size: number;
    file_type: string;
    moved_from_folder: string;
    saved_by: string;
    saved_at: string;
    notes: string;
}

export interface MoveHistoryBatch {
    batch_id: string;
    moved_at: string;
    item_count: number;
    items: Array<{ item_type: string; item_id: number; item_name: string; from_folder: string; to_folder: string }>;
    can_undo: boolean;
    undone: boolean;
    expires_in: string;
}

// ============================================
// MOVE OPERATIONS
// ============================================
export const moveSingle = (
    file_id: number,
    target_folder_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post<MoveResult>(`${BASE}/single`, { file_id, target_folder_id, moved_by, conflict_strategy });

export const moveBulk = (
    file_ids: number[],
    folder_ids: number[],
    target_folder_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post(`${BASE}/bulk`, { file_ids, folder_ids, target_folder_id, moved_by, conflict_strategy });

export const moveMixed = (
    items: Array<{ id: number; type: 'file' | 'folder' }>,
    target_folder_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post(`${BASE}/mixed`, { items, target_folder_id, moved_by, conflict_strategy });

export const moveFolderWithContents = (
    folder_id: number,
    target_folder_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post(`${BASE}/folder`, { folder_id, target_folder_id, moved_by, conflict_strategy });

// ============================================
// PREVIEW
// ============================================
export const getMovePreview = (file_ids: number[], folder_ids: number[], target_folder_id: number | null) =>
    api.get(`${BASE}/preview`, { params: { file_ids, folder_ids, target_folder_id } });

// ============================================
// VERSION HISTORY
// ============================================
export const getVersionHistory = (fileId: number) =>
    api.get<{ versions: VersionEntry[]; total_versions: number }>(`${BASE}/versions/${fileId}`);

export const compareVersions = (fileId: number, v1: string | number, v2: string | number) =>
    api.get(`${BASE}/versions/${fileId}/compare`, { params: { v1, v2 } });

export const getVersionDownloadUrl = (fileId: number, versionId: number, userId: number) =>
    `${api.defaults.baseURL}${BASE}/versions/${fileId}/download/${versionId}?user_id=${userId}`;

export const restoreVersion = (fileId: number, versionId: number, restored_by: number) =>
    api.post(`${BASE}/versions/${fileId}/restore/${versionId}`, { restored_by });

export const deleteVersion = (fileId: number, versionId: number, deleted_by: number) =>
    api.delete(`${BASE}/versions/${fileId}/version/${versionId}`, { data: { deleted_by } });

// ============================================
// MOVE HISTORY / UNDO
// ============================================
export const getMoveHistory = (userId: number) =>
    api.get<{ history: MoveHistoryBatch[]; total: number; undo_window: string }>(`${BASE}/history`, { params: { user_id: userId } });

export const getBatchDetail = (batchId: string, userId: number) =>
    api.get(`${BASE}/history/${batchId}`, { params: { user_id: userId } });

export const undoBatch = (batchId: string, userId: number) =>
    api.post(`${BASE}/undo/${batchId}`, { user_id: userId });

export default {
    moveSingle,
    moveBulk,
    moveMixed,
    moveFolderWithContents,
    getMovePreview,
    getVersionHistory,
    compareVersions,
    getVersionDownloadUrl,
    restoreVersion,
    deleteVersion,
    getMoveHistory,
    getBatchDetail,
    undoBatch
};