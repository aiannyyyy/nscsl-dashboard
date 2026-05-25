import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import nsfFacilitiesService from '../../services/PDOServices/nsfFacilitesServices';
import type {
    NSFFacility,
    NSFFilterParams,
    NSFReactivationParams,
    NSFLogAction,
} from '../../services/PDOServices/nsfFacilitesServices';

// ── QUERY KEYS ────────────────────────────────────────────────────────────────
export const NSF_KEYS = {
    all:          ['nsf'] as const,
    facilities:   (params?: NSFFilterParams)        => ['nsf', 'facilities',   params] as const,
    facility:     (id: number)                       => ['nsf', 'facility',     id]     as const,
    summary:      (params?: NSFFilterParams)        => ['nsf', 'summary',      params] as const,
    distribution: ()                                 => ['nsf', 'distribution']         as const,
    reactivation: (params?: NSFReactivationParams)  => ['nsf', 'reactivation', params] as const,
    logs:         (params?: { facility_id?: number; action?: NSFLogAction; page?: number }) =>
                      ['nsf', 'logs', params] as const,
    provinces:    ['nsf', 'provinces'] as const,
};

const REFETCH_INTERVAL = 30_000; // 30 seconds


// ── GET ALL FACILITIES ────────────────────────────────────────────────────────
export const useNSFFacilities = (params?: NSFFilterParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.facilities(params),
        queryFn:         () => nsfFacilitiesService.getAll(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};


// ── GET SINGLE FACILITY ───────────────────────────────────────────────────────
export const useNSFFacility = (id: number) => {
    return useQuery({
        queryKey:  NSF_KEYS.facility(id),
        queryFn:   () => nsfFacilitiesService.getById(id),
        enabled:   !!id,
        staleTime: 10_000,
    });
};


// ── SUMMARY CARDS ─────────────────────────────────────────────────────────────
export const useNSFSummaryCards = (params?: NSFFilterParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.summary(params),
        queryFn:         () => nsfFacilitiesService.getSummaryCards(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};


// ── STATUS DISTRIBUTION CHART ─────────────────────────────────────────────────
export const useNSFStatusDistribution = () => {
    return useQuery({
        queryKey:        NSF_KEYS.distribution(),
        queryFn:         () => nsfFacilitiesService.getStatusDistribution(),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};


// ── REACTIVATION STATUS ───────────────────────────────────────────────────────
export const useNSFReactivationStatus = (params?: NSFReactivationParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.reactivation(params),
        queryFn:         () => nsfFacilitiesService.getReactivationStatus(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};


// ── REACTIVATION LOGS ─────────────────────────────────────────────────────────
export const useNSFReactivationLogs = (params?: {
    facility_id?: number;
    action?: NSFLogAction;
    page?: number;
    limit?: number;
}) => {
    return useQuery({
        queryKey:        NSF_KEYS.logs(params),
        queryFn:         () => nsfFacilitiesService.getReactivationLogs(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};


// ── PROVINCES DROPDOWN ────────────────────────────────────────────────────────
export const useNSFProvinces = () => {
    return useQuery({
        queryKey:  NSF_KEYS.provinces,
        queryFn:   () => nsfFacilitiesService.getProvinces(),
        staleTime: 5 * 60_000,
    });
};


// ── ADD FACILITY ──────────────────────────────────────────────────────────────
export const useAddNSFFacility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<NSFFacility>) => nsfFacilitiesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NSF_KEYS.all });
        },
        onError: (error: any) => {
            console.error('addNSFFacility error:', error?.response?.data?.message || error.message);
        },
    });
};


// ── UPDATE FACILITY ───────────────────────────────────────────────────────────
export const useUpdateNSFFacility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<NSFFacility> }) =>
            nsfFacilitiesService.update(id, data),
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: NSF_KEYS.facility(variables.id) });
            queryClient.invalidateQueries({ queryKey: NSF_KEYS.all });
        },
        onError: (error: any) => {
            console.error('updateNSFFacility error:', error?.response?.data?.message || error.message);
        },
    });
};


// ── DELETE FACILITY ───────────────────────────────────────────────────────────
export const useDeleteNSFFacility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, deleted_by }: { id: number; deleted_by: string }) =>
            nsfFacilitiesService.delete(id, deleted_by),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NSF_KEYS.all });
        },
        onError: (error: any) => {
            console.error('deleteNSFFacility error:', error?.response?.data?.message || error.message);
        },
    });
};

export const useNSFSummaryTrend = (params?: { month?: string; year?: string }) => {
    return useQuery({
        queryKey:        ['nsf', 'summary', 'trend', params],
        queryFn:         () => nsfFacilitiesService.getSummaryTrend(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       10_000,
    });
};