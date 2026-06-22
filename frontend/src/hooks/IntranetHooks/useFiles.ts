// hooks/IntranetHooks/useFiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import fileService from '../../services/IntranetServices/fileService';

// ============================================
// QUERY KEYS
// ============================================
export const fileKeys = {
    all:         ['intranet-files'] as const,
    rootList:    () => [...fileKeys.all, 'root'] as const,
    folder:      (folderId: number) => [...fileKeys.all, 'folder', folderId] as const,
    folderPath:  (folderId: number) => [...fileKeys.all, 'path', folderId] as const,
    itemInfo:    (id: number) => [...fileKeys.all, 'info', id] as const,
    search:      (query: string) => [...fileKeys.all, 'search', query] as const,
    stats:       () => [...fileKeys.all, 'stats'] as const,
    activityLogs:(params?: Record<string, unknown>) => [...fileKeys.all, 'activity-logs', params] as const,
    diskUsage:   () => [...fileKeys.all, 'disk-usage'] as const,
    recent:      (userId?: number) => [...fileKeys.all, 'recent', userId] as const,
    starred:     (userId: number) => [...fileKeys.all, 'starred', userId] as const,
    starStatus:  (fileId: number, userId: number) => [...fileKeys.all, 'star-status', fileId, userId] as const,
    users:       () => [...fileKeys.all, 'users'] as const,
};

// ============================================
// QUERIES — LISTING
// ============================================
export const useRootList = () =>
    useQuery({
        queryKey: fileKeys.rootList(),
        queryFn:  () => fileService.getRootList().then(res => res.data),
    });

export const useFolderContents = (folderId: number | null) =>
    useQuery({
        queryKey: fileKeys.folder(folderId ?? 0),
        queryFn:  () => fileService.getFolderContents(folderId as number).then(res => res.data),
        enabled:  folderId !== null,
    });

export const useFolderPath = (folderId: number | null) =>
    useQuery({
        queryKey: fileKeys.folderPath(folderId ?? 0),
        queryFn:  () => fileService.getFolderPath(folderId as number).then(res => res.data),
        enabled:  folderId !== null,
    });

export const useItemInfo = (id: number | null) =>
    useQuery({
        queryKey: fileKeys.itemInfo(id ?? 0),
        queryFn:  () => fileService.getItemInfo(id as number).then(res => res.data),
        enabled:  id !== null,
    });

// ============================================
// QUERIES — SEARCH & STATS
// ============================================
export const useFileSearch = (query: string, filters?: Record<string, string>) =>
    useQuery({
        queryKey: fileKeys.search(query),
        queryFn:  () => fileService.search(query, filters).then(res => res.data),
        enabled:  query.trim().length > 0,
    });

export const useFileStats = () =>
    useQuery({
        queryKey: fileKeys.stats(),
        queryFn:  () => fileService.getStats().then(res => res.data),
    });

export const useActivityLogs = (params?: { user_id?: number; action?: string; limit?: number; offset?: number }) =>
    useQuery({
        queryKey: fileKeys.activityLogs(params),
        queryFn:  () => fileService.getActivityLogs(params).then(res => res.data),
    });

export const useDiskUsage = () =>
    useQuery({
        queryKey: fileKeys.diskUsage(),
        queryFn:  () => fileService.getDiskUsage().then(res => res.data),
    });

export const useRecentFiles = (limit = 20, userId?: number) =>
    useQuery({
        queryKey: fileKeys.recent(userId),
        queryFn:  () => fileService.getRecentFiles(limit, userId).then(res => res.data),
    });

// ============================================
// QUERIES — STARRED
// ============================================
export const useStarredFiles = (userId: number) =>
    useQuery({
        queryKey: fileKeys.starred(userId),
        queryFn:  () => fileService.getStarredFiles(userId).then(res => res.data),
        enabled:  !!userId,
    });

export const useStarStatus = (fileId: number, userId: number) =>
    useQuery({
        queryKey: fileKeys.starStatus(fileId, userId),
        queryFn:  () => fileService.getStarStatus(fileId, userId).then(res => res.data),
        enabled:  !!fileId && !!userId,
    });

// ============================================
// QUERIES — USERS
// ============================================
export const useIntranetUsers = () =>
    useQuery({
        queryKey: fileKeys.users(),
        queryFn:  () => fileService.getUsers().then(res => res.data),
    });

// ============================================
// MUTATIONS — FOLDERS
// ============================================
export const useCreateFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, parent_id, created_by }: { name: string; parent_id: number | null; created_by: number }) =>
            fileService.createFolder(name, parent_id, created_by),
        onSuccess: (_data, variables) => {
            if (variables.parent_id) {
                queryClient.invalidateQueries({ queryKey: fileKeys.folder(variables.parent_id) });
            } else {
                queryClient.invalidateQueries({ queryKey: fileKeys.rootList() });
            }
        },
    });
};

export const useBulkCreateFolders = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folders, created_by }: { folders: { name: string; parent_id: number | null }[]; created_by: number }) =>
            fileService.bulkCreateFolders(folders, created_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

// ============================================
// MUTATIONS — UPLOAD
// ============================================
export const useUploadFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, folder_id, created_by, extra }: { file: File; folder_id: number | null; created_by: number; extra?: Record<string, string> }) =>
            fileService.uploadFile(file, folder_id, created_by, extra),
        onSuccess: (_data, variables) => {
            if (variables.folder_id) {
                queryClient.invalidateQueries({ queryKey: fileKeys.folder(variables.folder_id) });
            } else {
                queryClient.invalidateQueries({ queryKey: fileKeys.rootList() });
            }
            queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
        },
    });
};

export const useUploadMultipleFiles = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ files, folder_id, created_by }: { files: File[]; folder_id: number | null; created_by: number }) =>
            fileService.uploadMultipleFiles(files, folder_id, created_by),
        onSuccess: (_data, variables) => {
            if (variables.folder_id) {
                queryClient.invalidateQueries({ queryKey: fileKeys.folder(variables.folder_id) });
            } else {
                queryClient.invalidateQueries({ queryKey: fileKeys.rootList() });
            }
        },
    });
};

export const useResolveUploadConflict = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: fileService.resolveUploadConflict,
        onSuccess: (_data, variables) => {
            if (variables.folder_id) {
                queryClient.invalidateQueries({ queryKey: fileKeys.folder(variables.folder_id) });
            } else {
                queryClient.invalidateQueries({ queryKey: fileKeys.rootList() });
            }
        },
    });
};

// ============================================
// MUTATIONS — MANAGEMENT
// ============================================
export const useRenameItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, new_name, updated_by }: { id: number; new_name: string; updated_by: number }) =>
            fileService.renameItem(id, new_name, updated_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useMoveItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, new_folder_id, updated_by }: { id: number; new_folder_id: number | null; updated_by: number }) =>
            fileService.moveItem(id, new_folder_id, updated_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useDeleteItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updated_by, force }: { id: number; updated_by: number; force?: boolean }) =>
            fileService.deleteItem(id, updated_by, force),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fileKeys.all });
            queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
        },
    });
};

export const useBulkDelete = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ids, updated_by, force }: { ids: number[]; updated_by: number; force?: boolean }) =>
            fileService.bulkDelete(ids, updated_by, force),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
    });
};

export const useCopyItems = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ source_ids, target_folder_id, created_by }: { source_ids: number[]; target_folder_id: number | null; created_by: number }) =>
            fileService.copyItems(source_ids, target_folder_id, created_by),
        onSuccess: (_data, variables) => {
            if (variables.target_folder_id) {
                queryClient.invalidateQueries({ queryKey: fileKeys.folder(variables.target_folder_id) });
            } else {
                queryClient.invalidateQueries({ queryKey: fileKeys.rootList() });
            }
        },
    });
};

// ============================================
// MUTATIONS — STARRED
// ============================================
export const useToggleStar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
            fileService.toggleStar(fileId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: fileKeys.starred(variables.userId) });
            queryClient.invalidateQueries({ queryKey: fileKeys.starStatus(variables.fileId, variables.userId) });
        },
    });
};

export const useUnstarFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
            fileService.unstarFile(fileId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: fileKeys.starred(variables.userId) });
        },
    });
};