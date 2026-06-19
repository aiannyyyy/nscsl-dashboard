import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import nsfFacilitiesService from '../../services/PDOServices/nsfFacilitesServices';
import type {
    NSFFacility,
    NSFFilterParams,
    NSFReactivationParams,
    NSFReactivationLogsParams,
    NSFSummaryTrendParams,
    NSFLogAction,
} from '../../services/PDOServices/nsfFacilitesServices';

// ── QUERY KEYS ────────────────────────────────────────────────────────────────

export const NSF_KEYS = {
    all:                   ['nsf'] as const,
    facilities:            (params?: NSFFilterParams)           => ['nsf', 'facilities',             params] as const,
    facility:              (id: number)                          => ['nsf', 'facility',               id]     as const,
    summary:               (params?: NSFFilterParams)           => ['nsf', 'summary',                params] as const,
    distribution:          (params?: Pick<NSFFilterParams, 'province'>) =>
                               ['nsf', 'distribution',           params] as const,
    reactivation:          (params?: NSFReactivationParams)     => ['nsf', 'reactivation',           params] as const,
    reactivatedByProvince: (params?: NSFReactivationParams)     => ['nsf', 'reactivated-by-province', params] as const,
    logs:                  (params?: NSFReactivationLogsParams) => ['nsf', 'logs',                   params] as const,
    provinces:             ['nsf', 'provinces'] as const,
    trend:                 (params?: NSFSummaryTrendParams)     => ['nsf', 'summary', 'trend',       params] as const,
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const REFETCH_INTERVAL = 30_000; // 30 seconds
const STALE_TIME       = 10_000; // 10 seconds

// ── HELPERS ───────────────────────────────────────────────────────────────────

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['nsf'] });
};

// ── GET ALL FACILITIES ────────────────────────────────────────────────────────

export const useNSFFacilities = (params?: NSFFilterParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.facilities(params),
        queryFn:         () => nsfFacilitiesService.getAll(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── GET SINGLE FACILITY ───────────────────────────────────────────────────────

export const useNSFFacility = (id: number) => {
    return useQuery({
        queryKey:  NSF_KEYS.facility(id),
        queryFn:   () => nsfFacilitiesService.getById(id),
        enabled:   !!id,
        staleTime: STALE_TIME,
    });
};

// ── SUMMARY CARDS ─────────────────────────────────────────────────────────────
// Accepts province so the cards filter to the selected province.

export const useNSFSummaryCards = (params?: NSFFilterParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.summary(params),
        queryFn:         () => nsfFacilitiesService.getSummaryCards(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── SUMMARY TREND ─────────────────────────────────────────────────────────────
// Accepts province so the month-over-month delta reflects the selected province.

export const useNSFSummaryTrend = (params?: NSFSummaryTrendParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.trend(params),
        queryFn:         () => nsfFacilitiesService.getSummaryTrend(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── STATUS DISTRIBUTION CHART ─────────────────────────────────────────────────
// Accepts province so the pie chart filters to the selected province.

export const useNSFStatusDistribution = (params?: Pick<NSFFilterParams, 'province'>) => {
    return useQuery({
        queryKey:        NSF_KEYS.distribution(params),
        queryFn:         () => nsfFacilitiesService.getStatusDistribution(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── REACTIVATION STATUS (pure read) ──────────────────────────────────────────

export const useNSFReactivationStatus = (params?: NSFReactivationParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.reactivation(params),
        queryFn:         () => nsfFacilitiesService.getReactivationStatus(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── REACTIVATED BY PROVINCE (chart) ──────────────────────────────────────────
// Accepts province to further narrow the pie chart to a single province's logs.

export const useNSFReactivatedByProvince = (params?: NSFReactivationParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.reactivatedByProvince(params),
        queryFn:         () => nsfFacilitiesService.getReactivatedByProvince(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── REACTIVATION LOGS ─────────────────────────────────────────────────────────

export const useNSFReactivationLogs = (params?: NSFReactivationLogsParams) => {
    return useQuery({
        queryKey:        NSF_KEYS.logs(params),
        queryFn:         () => nsfFacilitiesService.getReactivationLogs(params),
        refetchInterval: REFETCH_INTERVAL,
        staleTime:       STALE_TIME,
    });
};

// ── PROVINCES DROPDOWN ────────────────────────────────────────────────────────

export const useNSFProvinces = () => {
    return useQuery({
        queryKey:  NSF_KEYS.provinces,
        queryFn:   () => nsfFacilitiesService.getProvinces(),
        staleTime: 5 * 60_000, // 5 minutes — provinces change rarely
    });
};

// ── ADD FACILITY ──────────────────────────────────────────────────────────────

export const useAddNSFFacility = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<NSFFacility>) =>
            nsfFacilitiesService.create(data),
        onSuccess: () => invalidateAll(queryClient),
        onError:   (error: any) =>
            console.error('addNSFFacility error:', error?.response?.data?.message || error.message),
    });
};

// ── UPDATE FACILITY ───────────────────────────────────────────────────────────

export const useUpdateNSFFacility = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<NSFFacility> }) =>
            nsfFacilitiesService.update(id, data),
        onSuccess: (_result, variables) => {
            invalidateAll(queryClient);
            queryClient.invalidateQueries({ queryKey: NSF_KEYS.facility(variables.id) });
        },
        onError: (error: any) =>
            console.error('updateNSFFacility error:', error?.response?.data?.message || error.message),
    });
};

// ── DELETE FACILITY ───────────────────────────────────────────────────────────

export const useDeleteNSFFacility = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleted_by }: { id: number; deleted_by: string }) =>
            nsfFacilitiesService.delete(id, deleted_by),
        onSuccess: () => invalidateAll(queryClient),
        onError:   (error: any) =>
            console.error('deleteNSFFacility error:', error?.response?.data?.message || error.message),
    });
};

// ── SYNC LAST SAMPLE SENT ─────────────────────────────────────────────────────

export const useSyncLastSampleSent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => nsfFacilitiesService.syncLastSampleSent(),
        onSuccess:  (result) => {
            invalidateAll(queryClient);
            console.log(`[Sync] last_sample_sent: ${result.updated}/${result.total_facilities} updated`);
        },
        onError: (error: any) =>
            console.error('syncLastSampleSent error:', error?.response?.data?.message || error.message),
    });
};

// ── SYNC REACTIVATION STATUS ──────────────────────────────────────────────────

export const useSyncReactivationStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => nsfFacilitiesService.syncReactivationStatus(),
        onSuccess:  (result) => {
            invalidateAll(queryClient);
            console.log(`[Sync] Reactivation: deactivated ${result.deactivated}, reactivated ${result.reactivated}`);
        },
        onError: (error: any) =>
            console.error('syncReactivationStatus error:', error?.response?.data?.message || error.message),
    });
};