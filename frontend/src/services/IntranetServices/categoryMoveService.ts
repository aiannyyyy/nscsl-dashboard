// services/IntranetServices/categoryMoveService.ts
import api from '../api';

const BASE = '/intranet/category-move';

// ============================================
// TYPES
// ============================================
export type ConflictStrategy = 'ask' | 'overwrite' | 'version' | 'skip';

export interface CategoryMoveResult {
    message: string;
    moved?: boolean;
    skipped?: boolean;
    conflict?: boolean;
    batch_id?: string;
    strategy_used?: string;
    available_strategies?: string[];
}

export interface CategoryFolderTreeItem {
    id: number;
    name: string;
    parent_folder_id: number | null;
    category_id: number;
}

export interface MoveCategory {
    id: number;
    name: string;
    color: string;
    icon: string;
}

// ============================================
// MOVE OPERATIONS
// ============================================
export const moveSingle = (
    file_id: number,
    target_folder_id: number | null,
    target_category_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post<CategoryMoveResult>(`${BASE}/single`, { file_id, target_folder_id, target_category_id, moved_by, conflict_strategy });

export const moveBulk = (
    file_ids: number[],
    folder_ids: number[],
    target_folder_id: number | null,
    target_category_id: number | null,
    moved_by: number,
    conflict_strategy: ConflictStrategy = 'ask'
) => api.post(`${BASE}/bulk`, { file_ids, folder_ids, target_folder_id, target_category_id, moved_by, conflict_strategy });

// ============================================
// PREVIEW
// ============================================
export const getMovePreview = (
    file_ids: number[],
    folder_ids: number[],
    target_folder_id: number | null,
    target_category_id: number | null
) => api.get(`${BASE}/preview`, { params: { file_ids, folder_ids, target_folder_id, target_category_id } });

// ============================================
// MOVE HISTORY / UNDO
// ============================================
export const getMoveHistory = (userId: number) =>
    api.get(`${BASE}/history`, { params: { user_id: userId } });

export const undoBatch = (batchId: string, userId: number) =>
    api.post(`${BASE}/undo/${batchId}`, { user_id: userId });

// ============================================
// FOLDER TREE & CATEGORIES (for move modal)
// ============================================
export const getFoldersForTree = (categoryId: number, parentFolderId: number | null = null) =>
    api.get<{ folders: CategoryFolderTreeItem[] }>(`${BASE}/folders`, {
        params: { category_id: categoryId, parent_folder_id: parentFolderId === null ? 'null' : parentFolderId }
    });

export const getCategoriesForMove = () =>
    api.get<{ categories: MoveCategory[] }>(`${BASE}/categories`);

export default {
    moveSingle,
    moveBulk,
    getMovePreview,
    getMoveHistory,
    undoBatch,
    getFoldersForTree,
    getCategoriesForMove
};