// hooks/IntranetHooks/useMove.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moveService, { ConflictStrategy } from '../../services/IntranetServices/moveService';
import { fileKeys } from './useFiles';

// ============================================
// QUERY KEYS
// ============================================
export const moveKeys = {
    all:            ['intranet-move'] as const,
    preview:        (fileIds: number[], folderIds: number[], targetFolderId: number | null) =>
                        [...moveKeys.all, 'preview', fileIds, folderIds, targetFolderId] as const,
    versionHistory: (fileId: number) => [...moveKeys.all, 'versions', fileId] as const,
    compareVersions:(fileId: number, v1: string | number, v2: string | number) =>
                        [...moveKeys.all, 'compare', fileId, v1, v2] as const,
    history:        (userId: number) => [...moveKeys.all, 'history', userId] as const,
    batchDetail:    (batchId: string, userId: number) => [...moveKeys.all, 'batch', batchId, userId] as const,
};

// ============================================
// QUERIES — PREVIEW
// ============================================
export const useMovePreview = (fileIds: number[], folderIds: number[], targetFolderId: number | null, enabled = true) =>
    useQuery({
        queryKey: moveKeys.preview(fileIds, folderIds, targetFolderId),
        queryFn:  () => moveService.getMovePreview(fileIds, folderIds, targetFolderId).then(res => res.data),
        enabled:  enabled && (fileIds.length > 0 || folderIds.length > 0),
    });

// ============================================
// QUERIES — VERSION HISTORY
// ============================================
export const useVersionHistory = (fileId: number | null) =>
    useQuery({
        queryKey: moveKeys.versionHistory(fileId ?? 0),
        queryFn:  () => moveService.getVersionHistory(fileId as number).then(res => res.data),
        enabled:  fileId !== null,
    });

export const useCompareVersions = (fileId: number | null, v1: string | number, v2: string | number) =>
    useQuery({
        queryKey: moveKeys.compareVersions(fileId ?? 0, v1, v2),
        queryFn:  () => moveService.compareVersions(fileId as number, v1, v2).then(res => res.data),
        enabled:  fileId !== null && !!v1 && !!v2,
    });

// ============================================
// QUERIES — MOVE HISTORY
// ============================================
export const useMoveHistory = (userId: number) =>
    useQuery({
        queryKey: moveKeys.history(userId),
        queryFn:  () => moveService.getMoveHistory(userId).then(res => res.data),
        enabled:  !!userId,
    });

export const useBatchDetail = (batchId: string | null, userId: number) =>
    useQuery({
        queryKey: moveKeys.batchDetail(batchId ?? '', userId),
        queryFn:  () => moveService.getBatchDetail(batchId as string, userId).then(res => res.data),
        enabled:  !!batchId && !!userId,
    });

// ============================================
// MUTATIONS — MOVE OPERATIONS
// Invalidate intranet-files queries since move affects file/folder listings
// ============================================
export const useMoveSingle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file_id, target_folder_id, moved_by, conflict_strategy }: {
            file_id: number; target_folder_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => moveService.moveSingle(file_id, target_folder_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useMoveBulk = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file_ids, folder_ids, target_folder_id, moved_by, conflict_strategy }: {
            file_ids: number[]; folder_ids: number[]; target_folder_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => moveService.moveBulk(file_ids, folder_ids, target_folder_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useMoveMixed = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ items, target_folder_id, moved_by, conflict_strategy }: {
            items: Array<{ id: number; type: 'file' | 'folder' }>; target_folder_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => moveService.moveMixed(items, target_folder_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useMoveFolderWithContents = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folder_id, target_folder_id, moved_by, conflict_strategy }: {
            folder_id: number; target_folder_id: number | null; moved_by: number; conflict_strategy?: ConflictStrategy;
        }) => moveService.moveFolderWithContents(folder_id, target_folder_id, moved_by, conflict_strategy),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

// ============================================
// MUTATIONS — VERSIONS
// ============================================
export const useRestoreVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, versionId, restored_by }: { fileId: number; versionId: number; restored_by: number }) =>
            moveService.restoreVersion(fileId, versionId, restored_by),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: moveKeys.versionHistory(variables.fileId) });
            queryClient.invalidateQueries({ queryKey: fileKeys.itemInfo(variables.fileId) });
        },
    });
};

export const useDeleteVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, versionId, deleted_by }: { fileId: number; versionId: number; deleted_by: number }) =>
            moveService.deleteVersion(fileId, versionId, deleted_by),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: moveKeys.versionHistory(variables.fileId) });
        },
    });
};

// ============================================
// MUTATIONS — UNDO
// ============================================
export const useUndoBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ batchId, userId }: { batchId: string; userId: number }) =>
            moveService.undoBatch(batchId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: fileKeys.all });
            queryClient.invalidateQueries({ queryKey: moveKeys.history(variables.userId) });
        },
    });
};