// hooks/IntranetHooks/useCategoryMove.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import categoryMoveService, { ConflictStrategy } from '../../services/IntranetServices/categoryMoveService';
import { categoryKeys } from './useCategories';

// ============================================
// QUERY KEYS
// ============================================
export const categoryMoveKeys = {
    all:         ['intranet-category-move'] as const,
    preview:     (fileIds: number[], folderIds: number[], targetFolderId: number | null, targetCategoryId: number | null) =>
                     [...categoryMoveKeys.all, 'preview', fileIds, folderIds, targetFolderId, targetCategoryId] as const,
    history:     (userId: number) => [...categoryMoveKeys.all, 'history', userId] as const,
    folderTree:  (categoryId: number, parentFolderId: number | null) =>
                     [...categoryMoveKeys.all, 'folders', categoryId, parentFolderId] as const,
    categories:  () => [...categoryMoveKeys.all, 'categories'] as const,
};

// ============================================
// QUERIES — PREVIEW
// ============================================
export const useCategoryMovePreview = (
    fileIds: number[],
    folderIds: number[],
    targetFolderId: number | null,
    targetCategoryId: number | null,
    enabled = true
) =>
    useQuery({
        queryKey: categoryMoveKeys.preview(fileIds, folderIds, targetFolderId, targetCategoryId),
        queryFn:  () => categoryMoveService.getMovePreview(fileIds, folderIds, targetFolderId, targetCategoryId).then(res => res.data),
        enabled:  enabled && (fileIds.length > 0 || folderIds.length > 0),
    });

// ============================================
// QUERIES — MOVE HISTORY
// ============================================
export const useCategoryMoveHistory = (userId: number) =>
    useQuery({
        queryKey: categoryMoveKeys.history(userId),
        queryFn:  () => categoryMoveService.getMoveHistory(userId).then(res => res.data),
        enabled:  !!userId,
    });

// ============================================
// QUERIES — FOLDER TREE & CATEGORIES (for move modal)
// ============================================
export const useFoldersForMoveTree = (categoryId: number | null, parentFolderId: number | null = null) =>
    useQuery({
        queryKey: categoryMoveKeys.folderTree(categoryId ?? 0, parentFolderId),
        queryFn:  () => categoryMoveService.getFoldersForTree(categoryId as number, parentFolderId).then(res => res.data),
        enabled:  categoryId !== null,
    });

export const useCategoriesForMove = () =>
    useQuery({
        queryKey: categoryMoveKeys.categories(),
        queryFn:  () => categoryMoveService.getCategoriesForMove().then(res => res.data),
    });

// ============================================
// MUTATIONS — MOVE OPERATIONS
// Invalidate intranet-categories queries since move affects file/folder listings
// ============================================
export const useCategoryMoveSingle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file_id, target_folder_id, target_category_id, moved_by, conflict_strategy }: {
            file_id: number; target_folder_id: number | null; target_category_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => categoryMoveService.moveSingle(file_id, target_folder_id, target_category_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

export const useCategoryMoveBulk = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file_ids, folder_ids, target_folder_id, target_category_id, moved_by, conflict_strategy }: {
            file_ids: number[]; folder_ids: number[]; target_folder_id: number | null; target_category_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => categoryMoveService.moveBulk(file_ids, folder_ids, target_folder_id, target_category_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

// ============================================
// MUTATIONS — UNDO
// ============================================
export const useCategoryUndoBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ batchId, userId }: { batchId: string; userId: number }) =>
            categoryMoveService.undoBatch(batchId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.all });
            queryClient.invalidateQueries({ queryKey: categoryMoveKeys.history(variables.userId) });
        },
    });
};