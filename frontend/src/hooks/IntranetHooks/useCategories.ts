// hooks/IntranetHooks/useCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import categoryService from '../../services/IntranetServices/categoryService';

// ============================================
// QUERY KEYS
// ============================================
export const categoryKeys = {
    all:            ['intranet-categories'] as const,
    categories:     (params?: Record<string, unknown>) => [...categoryKeys.all, 'list', params] as const,
    category:       (id: number) => [...categoryKeys.all, 'detail', id] as const,
    folders:        (params?: Record<string, unknown>) => [...categoryKeys.all, 'folders', params] as const,
    folder:         (id: number) => [...categoryKeys.all, 'folder', id] as const,
    folderTree:     (categoryId: number) => [...categoryKeys.all, 'tree', categoryId] as const,
    search:         (query: string) => [...categoryKeys.all, 'search', query] as const,
    files:          (params?: Record<string, unknown>) => [...categoryKeys.all, 'files', params] as const,
    file:           (id: number) => [...categoryKeys.all, 'file', id] as const,
    fileVersions:   (fileId: number) => [...categoryKeys.all, 'versions', fileId] as const,
    starredFiles:   (userId: number) => [...categoryKeys.all, 'starred', userId] as const,
    starStatus:     (fileId: number, userId: number) => [...categoryKeys.all, 'star-status', fileId, userId] as const,
    fileStats:      (categoryId: number) => [...categoryKeys.all, 'stats', categoryId] as const,
};

// ============================================
// QUERIES — CATEGORIES
// ============================================
export const useCategories = (params?: { is_active?: boolean; created_by?: number }) =>
    useQuery({
        queryKey: categoryKeys.categories(params),
        queryFn:  () => categoryService.getCategories(params).then(res => res.data),
    });

export const useCategory = (id: number | null) =>
    useQuery({
        queryKey: categoryKeys.category(id ?? 0),
        queryFn:  () => categoryService.getCategory(id as number).then(res => res.data),
        enabled:  id !== null,
    });

// ============================================
// QUERIES — FOLDERS
// ============================================
export const useCategoryFolders = (params?: { category_id?: number; parent_folder_id?: number | string; is_active?: boolean }) =>
    useQuery({
        queryKey: categoryKeys.folders(params),
        queryFn:  () => categoryService.getFolders(params).then(res => res.data),
        enabled:  !!params?.category_id,
    });

export const useCategoryFolder = (id: number | null) =>
    useQuery({
        queryKey: categoryKeys.folder(id ?? 0),
        queryFn:  () => categoryService.getFolder(id as number).then(res => res.data),
        enabled:  id !== null,
    });

export const useFolderTree = (categoryId: number | null) =>
    useQuery({
        queryKey: categoryKeys.folderTree(categoryId ?? 0),
        queryFn:  () => categoryService.getFolderTree(categoryId as number).then(res => res.data),
        enabled:  categoryId !== null,
    });

// ============================================
// QUERIES — SEARCH
// ============================================
export const useCategorySearch = (query: string, limit = 50) =>
    useQuery({
        queryKey: categoryKeys.search(query),
        queryFn:  () => categoryService.search(query, limit).then(res => res.data),
        enabled:  query.trim().length > 0,
    });

// ============================================
// QUERIES — FILES
// ============================================
export const useCategoryFiles = (params?: { category_id?: number; folder_id?: number | string; file_type?: string; is_starred?: boolean; search?: string; limit?: number; offset?: number }) =>
    useQuery({
        queryKey: categoryKeys.files(params),
        queryFn:  () => categoryService.getFiles(params).then(res => res.data),
        enabled:  !!params?.category_id,
    });

export const useCategoryFile = (id: number | null) =>
    useQuery({
        queryKey: categoryKeys.file(id ?? 0),
        queryFn:  () => categoryService.getFile(id as number).then(res => res.data),
        enabled:  id !== null,
    });

export const useFileVersions = (fileId: number | null) =>
    useQuery({
        queryKey: categoryKeys.fileVersions(fileId ?? 0),
        queryFn:  () => categoryService.getFileVersions(fileId as number).then(res => res.data),
        enabled:  fileId !== null,
    });

// ============================================
// QUERIES — STARRED
// ============================================
export const useCategoryStarredFiles = (userId: number) =>
    useQuery({
        queryKey: categoryKeys.starredFiles(userId),
        queryFn:  () => categoryService.getStarredFiles(userId).then(res => res.data),
        enabled:  !!userId,
    });

export const useCategoryStarStatus = (fileId: number, userId: number) =>
    useQuery({
        queryKey: categoryKeys.starStatus(fileId, userId),
        queryFn:  () => categoryService.getStarStatus(fileId, userId).then(res => res.data),
        enabled:  !!fileId && !!userId,
    });

// ============================================
// QUERIES — STATS
// ============================================
export const useCategoryFileStats = (categoryId: number | null) =>
    useQuery({
        queryKey: categoryKeys.fileStats(categoryId ?? 0),
        queryFn:  () => categoryService.getFileStats(categoryId as number).then(res => res.data),
        enabled:  categoryId !== null,
    });

// ============================================
// MUTATIONS — CATEGORIES
// ============================================
export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoryService.createCategory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Parameters<typeof categoryService.updateCategory>[1] }) =>
            categoryService.updateCategory(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.category(variables.id) });
            queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleted_by }: { id: number; deleted_by: number }) =>
            categoryService.deleteCategory(id, deleted_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

// ============================================
// MUTATIONS — FOLDERS
// ============================================
export const useCreateCategoryFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoryService.createFolder,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.folders({ category_id: variables.category_id }) });
            queryClient.invalidateQueries({ queryKey: categoryKeys.folderTree(variables.category_id) });
        },
    });
};

export const useUpdateCategoryFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Parameters<typeof categoryService.updateFolder>[1] }) =>
            categoryService.updateFolder(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

export const useDeleteCategoryFolder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleted_by }: { id: number; deleted_by: number }) =>
            categoryService.deleteFolder(id, deleted_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

// ============================================
// MUTATIONS — UPLOAD
// ============================================
export const useUploadCategoryFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, category_id, folder_id, created_by, description }: { file: File; category_id: number; folder_id: number | null; created_by: number; description?: string }) =>
            categoryService.uploadSingleFile(file, category_id, folder_id, created_by, description ? { description } : undefined),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.files({ category_id: variables.category_id }) });
            queryClient.invalidateQueries({ queryKey: categoryKeys.fileStats(variables.category_id) });
        },
    });
};

export const useUploadMultipleCategoryFiles = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ files, category_id, folder_id, created_by }: { files: File[]; category_id: number; folder_id: number | null; created_by: number }) =>
            categoryService.uploadMultipleFiles(files, category_id, folder_id, created_by),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.files({ category_id: variables.category_id }) });
        },
    });
};

export const useResolveCategoryUploadConflict = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoryService.resolveUploadConflict,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.files({ category_id: variables.category_id }) });
        },
    });
};

// ============================================
// MUTATIONS — FILE MANAGEMENT
// ============================================
export const useUpdateCategoryFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Parameters<typeof categoryService.updateFile>[1] }) =>
            categoryService.updateFile(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

export const useDeleteCategoryFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleted_by }: { id: number; deleted_by: number }) =>
            categoryService.deleteFile(id, deleted_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

export const useMoveMultipleCategoryFiles = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file_ids, target_category_id, target_folder_id, moved_by }: { file_ids: number[]; target_category_id: number; target_folder_id: number | null; moved_by: number }) =>
            categoryService.moveMultipleFiles(file_ids, target_category_id, target_folder_id, moved_by),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

// ============================================
// MUTATIONS — VERSIONS
// ============================================
export const useRestoreCategoryFileVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, versionId, restored_by }: { fileId: number; versionId: number; restored_by: number }) =>
            categoryService.restoreFileVersion(fileId, versionId, restored_by),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.fileVersions(variables.fileId) });
            queryClient.invalidateQueries({ queryKey: categoryKeys.file(variables.fileId) });
        },
    });
};

export const useDeleteCategoryFileVersion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, versionId, deleted_by }: { fileId: number; versionId: number; deleted_by: number }) =>
            categoryService.deleteFileVersion(fileId, versionId, deleted_by),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.fileVersions(variables.fileId) });
        },
    });
};

// ============================================
// MUTATIONS — STARRED
// ============================================
export const useToggleCategoryStar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
            categoryService.toggleStar(fileId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.starredFiles(variables.userId) });
            queryClient.invalidateQueries({ queryKey: categoryKeys.starStatus(variables.fileId, variables.userId) });
        },
    });
};

export const useUnstarCategoryFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
            categoryService.unstarFile(fileId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.starredFiles(variables.userId) });
        },
    });
};