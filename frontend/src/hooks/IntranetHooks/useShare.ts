// hooks/IntranetHooks/useShare.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shareService from '../../services/IntranetServices/shareService';

// ============================================
// QUERY KEYS
// ============================================
export const shareKeys = {
    all:                  ['intranet-share'] as const,
    sharedWithMe:         () => [...shareKeys.all, 'shared-with-me'] as const,
    fileShares:           (fileId: number) => [...shareKeys.all, 'file-shares', fileId] as const,
    categoryFileShares:   (categoryFileId: number) => [...shareKeys.all, 'category-file-shares', categoryFileId] as const,
    categoryShares:       (categoryId: number) => [...shareKeys.all, 'category-shares', categoryId] as const,
    sharedCategoriesWithMe: () => [...shareKeys.all, 'shared-categories-with-me'] as const,
    allUsers:             () => [...shareKeys.all, 'all-users'] as const,
    fileAccess:           (fileId: number, type: string) => [...shareKeys.all, 'access', fileId, type] as const,
};

// ============================================
// QUERIES
// ============================================
export const useSharedWithMe = () =>
    useQuery({
        queryKey: shareKeys.sharedWithMe(),
        queryFn:  () => shareService.getSharedWithMe().then(res => res.data),
    });

export const useFileShares = (fileId: number | null) =>
    useQuery({
        queryKey: shareKeys.fileShares(fileId ?? 0),
        queryFn:  () => shareService.getFileShares(fileId as number).then(res => res.data),
        enabled:  fileId !== null,
    });

export const useCategoryFileShares = (categoryFileId: number | null) =>
    useQuery({
        queryKey: shareKeys.categoryFileShares(categoryFileId ?? 0),
        queryFn:  () => shareService.getCategoryFileShares(categoryFileId as number).then(res => res.data),
        enabled:  categoryFileId !== null,
    });

export const useCategoryShares = (categoryId: number | null) =>
    useQuery({
        queryKey: shareKeys.categoryShares(categoryId ?? 0),
        queryFn:  () => shareService.getCategoryShares(categoryId as number).then(res => res.data),
        enabled:  categoryId !== null,
    });

export const useSharedCategoriesWithMe = () =>
    useQuery({
        queryKey: shareKeys.sharedCategoriesWithMe(),
        queryFn:  () => shareService.getSharedCategoriesWithMe().then(res => res.data),
    });

export const useAllUsersForShare = () =>
    useQuery({
        queryKey: shareKeys.allUsers(),
        queryFn:  () => shareService.getAllUsersForShare().then(res => res.data),
    });

export const useFileAccess = (fileId: number | null, type: 'regular' | 'category') =>
    useQuery({
        queryKey: shareKeys.fileAccess(fileId ?? 0, type),
        queryFn:  () => shareService.checkFileAccess(fileId as number, type).then(res => res.data),
        enabled:  fileId !== null,
    });

// ============================================
// MUTATIONS — SHARE
// ============================================
export const useShareFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userIds }: { fileId: number; userIds: number[] }) =>
            shareService.shareFile(fileId, userIds),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.fileShares(variables.fileId) });
        },
    });
};

export const useShareCategoryFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryFileId, userIds }: { categoryFileId: number; userIds: number[] }) =>
            shareService.shareCategoryFile(categoryFileId, userIds),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.categoryFileShares(variables.categoryFileId) });
        },
    });
};

export const useShareCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, userIds }: { categoryId: number; userIds: number[] }) =>
            shareService.shareCategory(categoryId, userIds),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.categoryShares(variables.categoryId) });
        },
    });
};

// ============================================
// MUTATIONS — REMOVE SHARE
// ============================================
export const useRemoveShare = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ shareId }: { shareId: number }) =>
            shareService.removeShare(shareId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: shareKeys.all }),
    });
};

export const useRemoveCategoryShare = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, userId }: { categoryId: number; userId: number }) =>
            shareService.removeCategoryShare(categoryId, userId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: shareKeys.categoryShares(variables.categoryId) });
        },
    });
};