import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import facilityVisitsService, {
    type FacilityVisit,
    type StatusCount,
    type FacilityLookup,
} from '../../services/PDOServices/facilityVisitsService'; // adjust path as needed

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const facilityVisitsKeys = {
    all:         ['facilityVisits'] as const,
    lists:       () => [...facilityVisitsKeys.all, 'list'] as const,
    statusCount: (dateFrom?: string, dateTo?: string, province?: string) =>
        [...facilityVisitsKeys.all, 'statusCount', { dateFrom, dateTo, province }] as const,
    byStatus:    (status: string, startDate?: string, endDate?: string) =>
        [...facilityVisitsKeys.all, 'byStatus', status, { startDate, endDate }] as const,
    lookup:      (facilityCode: string) =>
        [...facilityVisitsKeys.all, 'lookup', facilityCode] as const,
};

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches all facility visits.
 * Auto-refreshes every 30 seconds — suited for dashboard tables.
 */
export const useFacilityVisits = () => {
    return useQuery<FacilityVisit[]>({
        queryKey:             facilityVisitsKeys.lists(),
        queryFn:              () => facilityVisitsService.getAll(),
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      30 * 1000,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * Fetches status counts (active / inactive / closed).
 * Supports optional date range and province filters.
 * Auto-refreshes every 30 seconds.
 */
export const useFacilityStatusCount = (
    dateFrom?: string,
    dateTo?:   string,
    province?: string
) => {
    return useQuery<StatusCount>({
        queryKey:             facilityVisitsKeys.statusCount(dateFrom, dateTo, province),
        queryFn:              () => facilityVisitsService.getStatusCount(dateFrom, dateTo, province),
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      30 * 1000,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * Fetches facilities filtered by status.
 * Pass enabled=false to defer fetching (e.g. waiting for user selection).
 * Auto-refreshes every 30 seconds.
 */
export const useFacilitiesByStatus = (
    status:     string,
    startDate?: string,
    endDate?:   string,
    enabled:    boolean = true
) => {
    return useQuery<FacilityVisit[]>({
        queryKey:             facilityVisitsKeys.byStatus(status, startDate, endDate),
        queryFn:              () => facilityVisitsService.getFacilitiesByStatus(status, startDate, endDate),
        enabled:              enabled && !!status,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      30 * 1000,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * One-shot facility lookup by code.
 * No auto-refresh — lookup data is stable.
 * Pass enabled=false to defer until the user has typed a code.
 */
export const useFacilityLookup = (
    facilityCode: string,
    enabled:      boolean = true
) => {
    return useQuery<FacilityLookup | null>({
        queryKey:             facilityVisitsKeys.lookup(facilityCode),
        queryFn:              () => facilityVisitsService.lookupFacility(facilityCode),
        enabled:              enabled && facilityCode.trim().length > 0,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });
};

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new facility visit.
 * Invalidates all facilityVisits queries on success.
 */
export const useCreateFacilityVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: FormData) => facilityVisitsService.create(data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: facilityVisitsKeys.all });
        },
    });
};

/**
 * Updates an existing facility visit.
 * Invalidates all facilityVisits queries on success.
 */
export const useUpdateFacilityVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: FormData }) =>
            facilityVisitsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: facilityVisitsKeys.all });
        },
    });
};

/**
 * Deletes a facility visit.
 * Invalidates all facilityVisits queries on success.
 */
export const useDeleteFacilityVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => facilityVisitsService.delete(id),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: facilityVisitsKeys.all });
        },
    });
};

/**
 * Updates only the status field of a facility visit.
 * Invalidates all facilityVisits queries on success.
 */
export const useUpdateFacilityVisitStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            facilityVisitsService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: facilityVisitsKeys.all });
        },
    });
};